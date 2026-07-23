/**
 * /api/ask — Gemini API를 대신 호출해주는 서버리스 함수.
 *
 * API 키는 여기(서버)에서만 process.env.GEMINI_API_KEY로 읽으며,
 * 브라우저로 전달되거나 코드에 노출되지 않는다.
 * (Vercel 대시보드 → Settings → Environment Variables 에서 설정)
 */

const fs = require("fs");
const path = require("path");

// "gemini-flash-latest"는 Google이 관리하는 별칭으로, 항상 현재 시점의
// 최신 안정(GA) Flash 모델을 자동으로 가리킨다. 특정 버전명을 직접 박아두면
// 그 모델이 나중에 신규 사용자에게 지원 종료될 때 이 함수가 깨지므로,
// 별칭을 사용해 유지보수 부담을 줄인다.
const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  GEMINI_MODEL +
  ":generateContent";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST 요청만 허용됩니다." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "서버에 GEMINI_API_KEY가 설정되어 있지 않습니다. Vercel 프로젝트의 " +
        "Settings → Environment Variables 에서 GEMINI_API_KEY를 추가하고 재배포해 주세요.",
    });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  const question = body && typeof body.question === "string" ? body.question.trim() : "";

  if (!question) {
    res.status(400).json({ error: "질문 내용이 비어 있습니다." });
    return;
  }
  if (question.length > 500) {
    res.status(400).json({ error: "질문이 너무 깁니다. 500자 이내로 입력해 주세요." });
    return;
  }

  const context = buildContext();
  const prompt = buildPrompt(context, question);

  try {
    let geminiRes = await callGemini(apiKey, prompt, true);
    let data = await geminiRes.json();

    // thinkingConfig을 이 모델(버전)이 지원하지 않아 실패하는 경우를 대비해,
    // 해당 옵션 없이 한 번 더 시도한다 (미래 모델 변경에 대한 안전장치).
    if (!geminiRes.ok) {
      geminiRes = await callGemini(apiKey, prompt, false);
      data = await geminiRes.json();
    }

    if (!geminiRes.ok) {
      const msg = (data && data.error && data.error.message) || "Gemini API 호출 실패";
      res.status(geminiRes.status).json({ error: msg });
      return;
    }

    const answer =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text;

    if (!answer) {
      res.status(502).json({ error: "Gemini 응답을 해석하지 못했습니다." });
      return;
    }

    res.status(200).json({ answer: answer.trim() });
  } catch (err) {
    res.status(500).json({ error: "서버 오류: " + (err && err.message ? err.message : String(err)) });
  }
};

/** Gemini generateContent 호출. useThinkingConfig=false면 thinkingConfig 없이 호출(구형 모델 대비). */
async function callGemini(apiKey, prompt, useThinkingConfig) {
  const generationConfig = {
    maxOutputTokens: 2000,
    temperature: 0.4,
  };
  if (useThinkingConfig) {
    // 최신 Gemini 모델은 답하기 전 내부 "생각(thinking)" 단계를 거치는데,
    // 이 토큰도 maxOutputTokens 안에 포함되어 답변이 잘리는 원인이 된다.
    // 이 앱은 단순 안내 QA라 깊은 추론이 필요 없으므로 최소화한다.
    generationConfig.thinkingConfig = { thinkingLevel: "minimal" };
  }

  return fetch(GEMINI_URL + "?key=" + apiKey, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: generationConfig,
    }),
  });
}

/** data.json을 읽어 "어떤 과목에 어떤 자료가 있는지" 목록 문자열을 만든다. */
function buildContext() {
  try {
    const dataPath = path.join(process.cwd(), "data.json");
    const raw = fs.readFileSync(dataPath, "utf8");
    const data = JSON.parse(raw);
    const subjects = (data && data.subjects) || [];

    return subjects
      .map(function (s) {
        const docs = (s.documents || []).map(function (d) {
          return "- " + d.title;
        });
        return "[" + s.name + "]\n" + (docs.length ? docs.join("\n") : "(자료 없음)");
      })
      .join("\n\n");
  } catch (e) {
    return "(자료 목록을 불러오지 못했습니다.)";
  }
}

function buildPrompt(context, question) {
  return [
    "너는 고등학교 1학년 1-9반 학생들을 위한 시험 자료 다운로드 사이트의 안내 도우미야.",
    "아래는 이 사이트에 현재 등록된 과목별 자료 목록이야. 학생이 이 자료들에 대해 묻거나,",
    "시험 범위·공부 방법·일반적인 학습 관련 질문을 하면 친절하고 간결하게 한국어로 답해줘.",
    "사이트에 없는 내용을 마치 있는 것처럼 단정하지 말고, 확실하지 않으면 솔직히 모른다고 말해줘.",
    "답변은 3~6문장 정도로 간결하게, 존댓말로 작성해줘.",
    "",
    "=== 등록된 자료 목록 ===",
    context,
    "=== 목록 끝 ===",
    "",
    "학생 질문: " + question,
  ].join("\n");
}
