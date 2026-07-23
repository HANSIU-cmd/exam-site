/* 1-9반 시험 자료 다운로드 사이트
 * 모든 콘텐츠는 data.json에서 읽어와 렌더링한다 (하드코딩 금지).
 */
(function () {
  "use strict";

  var topLinkEl = document.getElementById("top-link");
  var subjectsEl = document.getElementById("subjects");
  var askForm = document.getElementById("ask-form");
  var askInput = document.getElementById("ask-input");
  var askAnswerEl = document.getElementById("ask-answer");

  if (askForm) {
    askForm.addEventListener("submit", function (e) {
      e.preventDefault();
      askQuestion();
    });
  }

  function askQuestion() {
    var question = askInput.value.trim();
    if (!question) return;

    var submitBtn = askForm.querySelector(".ask-submit");
    submitBtn.disabled = true;
    showAskState("이전 자료를 참고해서 답변을 생성하는 중…", "is-loading");

    fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error((data && data.error) || "요청 실패 (" + res.status + ")");
          return data;
        });
      })
      .then(function (data) {
        showAskState(data.answer || "답변을 받지 못했습니다.", "");
      })
      .catch(function (err) {
        showAskState(
          "답변을 가져오지 못했습니다. (" + (err && err.message ? err.message : "알 수 없는 오류") + ")",
          "is-error"
        );
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  }

  function showAskState(text, extraClass) {
    askAnswerEl.textContent = "";
    var box = document.createElement("div");
    box.className = "ask-answer-box" + (extraClass ? " " + extraClass : "");
    box.textContent = text;
    askAnswerEl.appendChild(box);
  }

  fetch("data.json", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("data.json 응답 오류: " + res.status);
      return res.json();
    })
    .then(render)
    .catch(function (err) {
      showError(err);
    });

  function render(data) {
    renderTopLinks(data);
    renderSubjects((data && data.subjects) || []);
  }

  function renderTopLinks(data) {
    topLinkEl.textContent = "";

    // topLinks(배열)를 우선 사용하고, 예전 단일 topLink도 계속 지원
    var links = [];
    if (data && Array.isArray(data.topLinks)) {
      links = data.topLinks;
    } else if (data && data.topLink) {
      links = [data.topLink];
    }

    links.forEach(function (link) {
      if (!link || !link.url) return;

      var a = document.createElement("a");
      // url에 공백·괄호·+ 등 특수문자가 있어도 정상적으로 열리도록 encodeURI 처리
      a.href = encodeURI(link.url);
      appendLinkLabel(a, link.label || link.url);

      // 새 탭 여부 자동 판별: "/"로 시작하는 내부 링크는 같은 탭,
      // http(s):// 외부 주소는 새 탭으로 연다. 외부 링크에만 ↗ 표시.
      if (isExternal(link.url)) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "external";
      }
      topLinkEl.appendChild(a);
    });
  }

  function isExternal(url) {
    return /^https?:\/\//i.test(url);
  }

  // 라벨 끝의 괄호 안내문은 회색(.link-note)으로 분리해 부차 정보로 표시
  function appendLinkLabel(a, label) {
    var m = label.match(/^([\s\S]*?)(\s*\([\s\S]*\))\s*$/);
    if (m && m[1].trim()) {
      a.appendChild(document.createTextNode(m[1].trim()));
      var note = document.createElement("span");
      note.className = "link-note";
      note.textContent = m[2].trim();
      a.appendChild(note);
    } else {
      a.appendChild(document.createTextNode(label));
    }
  }

  function renderSubjects(subjects) {
    subjectsEl.textContent = "";

    if (!subjects.length) {
      showMessage("표시할 과목이 없습니다.");
      return;
    }

    subjects.forEach(function (subject) {
      subjectsEl.appendChild(buildSubject(subject));
    });
  }

  function buildSubject(subject) {
    var section = document.createElement("section");
    section.className = "subject";

    var docs = (subject && subject.documents) || [];

    var title = document.createElement("h2");
    title.className = "subject-title";

    var nameSpan = document.createElement("span");
    nameSpan.className = "subject-name";
    nameSpan.textContent = subject && subject.name ? subject.name : "(이름 없음)";
    title.appendChild(nameSpan);

    var countSpan = document.createElement("span");
    countSpan.className = "subject-count";
    countSpan.textContent = docs.length + "개";
    title.appendChild(countSpan);

    section.appendChild(title);

    if (!docs.length) {
      var empty = document.createElement("p");
      empty.className = "subject-empty";
      empty.textContent = "등록된 문서가 없습니다.";
      section.appendChild(empty);
      return section;
    }

    var grid = document.createElement("div");
    grid.className = "doc-grid";
    // 등록 순서대로 표시 (정렬하지 않음)
    docs.forEach(function (doc) {
      grid.appendChild(buildDocCard(doc));
    });
    // 2열 그리드에서 항목이 홀수면 마지막 빈 칸을 투명 placeholder로 채워
    // 회색 채움 없이 아래 구분선만 이어지게 한다.
    if (docs.length % 2 === 1) {
      var filler = document.createElement("div");
      filler.className = "doc-card is-empty";
      filler.setAttribute("aria-hidden", "true");
      grid.appendChild(filler);
    }
    section.appendChild(grid);

    return section;
  }

  function buildDocCard(doc) {
    var card = document.createElement("div");
    card.className = "doc-card";

    // 위계: 파일형식 라벨(상단, 회색 대문자) → 파일명(500)
    var ext = getExtension(doc && doc.url);
    if (ext) {
      var extEl = document.createElement("span");
      extEl.className = "doc-ext";
      extEl.textContent = ext;
      card.appendChild(extEl);
    }

    var titleEl = document.createElement("p");
    titleEl.className = "doc-title";
    titleEl.textContent = (doc && doc.title) || "(제목 없음)";
    card.appendChild(titleEl);

    if (doc && doc.url) {
      var link = document.createElement("a");
      link.className = "doc-download";
      // 특수문자 포함 url을 encodeURI로 인코딩하여 브라우저에서 정상적으로 열리게 함
      link.href = encodeURI(doc.url);
      link.textContent = "다운로드";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      // PDF가 아닌 파일(.sdocx 등)도 그대로 다운로드 링크로 처리됨
      card.appendChild(link);
    }

    return card;
  }

  function getExtension(url) {
    if (!url) return "";
    // 쿼리/해시 제거 후 마지막 확장자만 추출
    var clean = url.split("?")[0].split("#")[0];
    var lastDot = clean.lastIndexOf(".");
    var lastSlash = clean.lastIndexOf("/");
    if (lastDot === -1 || lastDot < lastSlash) return "";
    return clean.slice(lastDot + 1).toLowerCase();
  }

  function showMessage(text) {
    subjectsEl.textContent = "";
    var p = document.createElement("p");
    p.className = "state-msg";
    p.textContent = text;
    subjectsEl.appendChild(p);
  }

  function showError(err) {
    subjectsEl.textContent = "";
    var p = document.createElement("p");
    p.className = "state-msg error";
    p.textContent =
      "자료를 불러오지 못했습니다. data.json을 확인해 주세요. (" +
      (err && err.message ? err.message : "알 수 없는 오류") +
      ")";
    subjectsEl.appendChild(p);
  }
})();
