// Theme management — restore before paint
(function () {
  var saved = localStorage.getItem("primer-docs-theme");
  if (saved) {
    document.documentElement.setAttribute("data-color-mode", saved);
  }
})();

function toggleTheme() {
  var html = document.documentElement;
  var next = html.getAttribute("data-color-mode") === "dark" ? "light" : "dark";
  html.setAttribute("data-color-mode", next);
  localStorage.setItem("primer-docs-theme", next);
}

document.addEventListener("DOMContentLoaded", function () {
  // Mobile nav toggle
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      links.classList.toggle("open");
    });
    document.addEventListener("click", function (e) {
      if (!toggle.contains(e.target) && !links.contains(e.target)) {
        links.classList.remove("open");
      }
    });
  }

  // Copy buttons on code blocks
  document.querySelectorAll(".code-block .copy-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var code = btn.closest(".code-block").querySelector("code");
      var text = code.textContent.replace(/^\$ /gm, "");
      navigator.clipboard.writeText(text.trim()).then(function () {
        var orig = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(function () {
          btn.textContent = orig;
        }, 2000);
      });
    });
  });

  // Install command copy
  document.querySelectorAll(".install-cmd[data-cmd]").forEach(function (el) {
    function copyCmd() {
      var cmd = el.getAttribute("data-cmd");
      navigator.clipboard.writeText(cmd).then(function () {
        var label = el.querySelector(".cmd-label");
        if (label) {
          var orig = label.textContent;
          label.textContent = "Copied!";
          setTimeout(function () {
            label.textContent = orig;
          }, 2000);
        }
      });
    }
    el.addEventListener("click", copyCmd);
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        copyCmd();
      }
    });
  });

  // TOC scroll spy
  var tocLinks = document.querySelectorAll(".toc-link");
  if (tocLinks.length > 0) {
    var sections = [];
    tocLinks.forEach(function (link) {
      var id = link.getAttribute("href");
      if (id && id.startsWith("#")) {
        var section = document.getElementById(id.slice(1));
        if (section) sections.push({ el: section, link: link });
      }
    });

    function updateToc() {
      var scrollPos = window.scrollY + 120;
      var active = null;
      for (var i = sections.length - 1; i >= 0; i--) {
        if (sections[i].el.offsetTop <= scrollPos) {
          active = sections[i].link;
          break;
        }
      }
      tocLinks.forEach(function (l) {
        l.classList.remove("active");
      });
      if (active) active.classList.add("active");
    }

    window.addEventListener("scroll", updateToc, { passive: true });
    updateToc();
  }
});
