/* 1-9반 시험 자료 다운로드 사이트
 * 모든 콘텐츠는 data.json에서 읽어와 렌더링한다 (하드코딩 금지).
 */
(function () {
  "use strict";

  var topLinkEl = document.getElementById("top-link");
  var subjectsEl = document.getElementById("subjects");

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
    renderTopLink(data && data.topLink);
    renderSubjects((data && data.subjects) || []);
  }

  function renderTopLink(topLink) {
    topLinkEl.textContent = "";
    if (!topLink || !topLink.url) return;

    var a = document.createElement("a");
    // url에 공백·괄호·+ 등 특수문자가 있어도 정상적으로 열리도록 encodeURI 처리
    a.href = encodeURI(topLink.url);
    a.textContent = topLink.label || topLink.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    topLinkEl.appendChild(a);
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
    section.appendChild(grid);

    return section;
  }

  function buildDocCard(doc) {
    var card = document.createElement("div");
    card.className = "doc-card";

    var titleEl = document.createElement("p");
    titleEl.className = "doc-title";
    titleEl.textContent = (doc && doc.title) || "(제목 없음)";

    var ext = getExtension(doc && doc.url);
    if (ext) {
      var extEl = document.createElement("span");
      extEl.className = "doc-ext";
      extEl.textContent = ext;
      titleEl.appendChild(extEl);
    }
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
