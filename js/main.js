
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const menuButton = document.querySelector("#menu-toggle");
  const menu = document.querySelector("#main-nav");
  const form = document.querySelector("#cep-form");
  const cepInput = document.querySelector("#cep");
  const error = document.querySelector("#cep-error");
  const status = document.querySelector("#search-status");
  const searchButton = document.querySelector("#search-button");
  const municipalityFilter = document.querySelector("#municipio-filter");

  function formatCep(value) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    return digits.length > 5
      ? `${digits.slice(0, 5)}-${digits.slice(5)}`
      : digits;
  }

  function setStatus(message) {
    status.textContent = message;
  }

  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    menuButton.querySelector('[aria-hidden="true"]').textContent = isOpen ? "☰" : "✕";
    menuButton.querySelector(".sr-only").textContent = isOpen ? "Abrir menu" : "Fechar menu";
    menu.classList.toggle("is-open", !isOpen);
  });

  menu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      menu.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.querySelector(".sr-only").textContent = "Abrir menu";
      menuButton.querySelector('[aria-hidden="true"]').textContent = "☰";
    });
  });

  cepInput.addEventListener("input", () => {
    const formatted = formatCep(cepInput.value);
    cepInput.value = formatted;
    cepInput.setCustomValidity("");
    error.textContent = "";
  });

  municipalityFilter.addEventListener("change", () => {
    if (window.EcoSaude && typeof window.EcoSaude.renderResults === "function") {
      window.EcoSaude.renderResults();
    }
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    error.textContent = "";
    setStatus("");

    const cep = cepInput.value.replace(/\D/g, "");

    if (!/^\d{8}$/.test(cep)) {
      error.textContent = "Digite um CEP válido com oito números.";
      cepInput.setAttribute("aria-invalid", "true");
      cepInput.focus();
      return;
    }

    cepInput.setAttribute("aria-invalid", "false");
    searchButton.disabled = true;
    searchButton.textContent = "Pesquisando...";
    setStatus("Consultando o CEP informado...");

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

      if (!response.ok) {
        throw new Error("Não foi possível consultar o serviço de CEP.");
      }

      const address = await response.json();

      if (address.erro) {
        throw new Error("CEP não encontrado. Confira os números digitados.");
      }

      setStatus(
        `Região consultada: ${[
          address.logradouro,
          address.bairro,
          address.localidade,
          address.uf
        ].filter(Boolean).join(", ")}. Procurando ecopontos cadastrados...`
      );

      if (!window.EcoSaude || typeof window.EcoSaude.searchByCep !== "function") {
        setStatus("CEP encontrado. A consulta aos ecopontos será ativada na próxima etapa.");
        return;
      }

      await window.EcoSaude.searchByCep(address);
    } catch (err) {
      setStatus(err.message || "Não foi possível concluir a consulta. Verifique sua conexão e tente novamente.");
    } finally {
      searchButton.disabled = false;
      searchButton.textContent = "Pesquisar ecopontos";
    }
  });

  if ("speechSynthesis" in window) {
    const readButton = document.createElement("button");
    readButton.type = "button";
    readButton.className = "button button-secondary";
    readButton.textContent = "Ouvir esta seção";
    readButton.style.margin = "12px 0";
    readButton.addEventListener("click", () => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        readButton.textContent = "Ouvir esta seção";
        return;
      }
      const section = readButton.closest("section");
      const text = section.innerText;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "pt-BR";
      utterance.onend = () => { readButton.textContent = "Ouvir esta seção"; };
      utterance.onerror = () => { readButton.textContent = "Ouvir esta seção"; };
      readButton.textContent = "Parar narração";
      window.speechSynthesis.speak(utterance);
    });

    document.querySelectorAll("main section.content-section").forEach(section => {
      const heading = section.querySelector(".section-heading");
      if (heading) heading.appendChild(readButton.cloneNode(true));
    });

    document.querySelectorAll("main section.content-section button").forEach(button => {
      if (button.textContent === "Ouvir esta seção") {
        button.addEventListener("click", () => {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            button.textContent = "Ouvir esta seção";
            return;
          }
          const utterance = new SpeechSynthesisUtterance(button.closest("section").innerText);
          utterance.lang = "pt-BR";
          utterance.onend = () => { button.textContent = "Ouvir esta seção"; };
          utterance.onerror = () => { button.textContent = "Ouvir esta seção"; };
          button.textContent = "Parar narração";
          window.speechSynthesis.speak(utterance);
        });
      }
    });
  }
});