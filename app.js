
const voiceButton = document.getElementById("voiceButton");
const voiceButtonText = document.getElementById("voiceButtonText");
const messages = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const clearButton = document.getElementById("clearButton");
const assistantStatus = document.getElementById("assistantStatus");
const connectionStatus = document.getElementById("connectionStatus");

let recognition = null;
let isListening = false;

// Türkçe metinleri karşılaştırmaya hazırla.
function normalizeText(value) {
  return value
    .toLocaleLowerCase("tr-TR")
    .trim()
    .replace(/[.,!?;:]+$/g, "")
    .replace(/\s+/g, " ");
}

// Sohbete mesaj ekle.
function addMessage(text, sender = "assistant") {
  const message = document.createElement("div");
  message.className = `message ${sender}`;
  message.textContent = text;

  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;

  saveChat();
}

// Sohbeti tarayıcıya kaydet.
function saveChat() {
  try {
    localStorage.setItem("rivriv-chat", messages.innerHTML);
  } catch (error) {
    console.warn("Sohbet kaydedilemedi:", error);
  }
}

// Önceki sohbeti yükle.
function loadChat() {
  try {
    const savedChat = localStorage.getItem("rivriv-chat");

    if (savedChat) {
      messages.innerHTML = savedChat;
      messages.scrollTop = messages.scrollHeight;
    }
  } catch (error) {
    console.warn("Sohbet yüklenemedi:", error);
  }
}

// Güncel saat.
function getCurrentTime() {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date());
}

// Güncel tarih.
function getCurrentDate() {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());
}

// Basit matematik işlemleri.
function calculateMath(text) {
  const cleaned = text
    .replace(/kaç eder|kaç yapar|hesapla|hesaplar mısın|sonucu söyle/g, "")
    .replace(/artı/g, "+")
    .replace(/eksi/g, "-")
    .replace(/çarpı|kere/g, "*")
    .replace(/bölü/g, "/")
    .replace(/x/g, "*")
    .replace(/,/g, ".")
    .trim();

  // Yalnızca sayılar ve temel matematik operatörleri kabul edilir.
  if (!/^[\d+\-*/().\s]+$/.test(cleaned)) {
    return null;
  }

  // İşlemde en az bir operatör olmalı.
  if (!/[+\-*/]/.test(cleaned)) {
    return null;
  }

  // Bilinmeyen kod çalıştırmak yerine güvenli bir matematik ayrıştırıcısı kullan.
  const tokens = cleaned.match(/\d*\.?\d+|[()+\-*/]/g);

  if (!tokens || tokens.join("") !== cleaned.replace(/\s/g, "")) {
    return null;
  }

  let position = 0;

  function parseExpression() {
    let value = parseTerm();

    while (tokens[position] === "+" || tokens[position] === "-") {
      const operator = tokens[position++];

      const right = parseTerm();
      value = operator === "+" ? value + right : value - right;
    }

    return value;
  }

  function parseTerm() {
    let value = parseFactor();

    while (tokens[position] === "*" || tokens[position] === "/") {
      const operator = tokens[position++];
      const right = parseFactor();

      if (operator === "/" && right === 0) {
        throw new Error("Sıfıra bölünemez.");
      }

      value = operator === "*" ? value * right : value / right;
    }

    return value;
  }

  function parseFactor() {
    if (tokens[position] === "+") {
      position++;
      return parseFactor();
    }

    if (tokens[position] === "-") {
      position++;
      return -parseFactor();
    }

    if (tokens[position] === "(") {
      position++;
      const value = parseExpression();

      if (tokens[position] !== ")") {
        throw new Error("Parantez hatası.");
      }

      position++;
      return value;
    }

    const token = tokens[position++];

    if (!token || !/^\d*\.?\d+$/.test(token)) {
      throw new Error("Geçersiz işlem.");
    }

    return Number(token);
  }

  try {
    const result = parseExpression();

    if (position !== tokens.length || !Number.isFinite(result)) {
      return null;
    }

    return Number(result.toPrecision(12)).toLocaleString("tr-TR");
  } catch (error) {
    return error.message === "Sıfıra bölünemez."
      ? "Kanka, bir sayıyı sıfıra bölemeyiz. 😅"
      : null;
  }
}

// Yerel asistan cevapları.
function localReply(rawText) {
  const text = normalizeText(rawText);

  // SAAT: Farklı söyleyişleri destekler.
  if (
    text === "saat" ||
    text.includes("saat kaç") ||
    text.includes("şu an saat") ||
    text.includes("şuan saat") ||
    text.includes("saati söyle") ||
    text.includes("kaç saat") ||
    text.includes("şu anki saat") ||
    text.includes("saat kaç oldu")
  ) {
    return `Kanka, şu an saat ${getCurrentTime()}. ⏰`;
  }

  // TARİH.
  if (
    text.includes("tarih") ||
    text.includes("bugün günlerden") ||
    text.includes("bugünün tarihi") ||
    text === "bugün" ||
    text.includes("hangi gündeyiz")
  ) {
    return `Bugün ${getCurrentDate()}. 📅`;
  }

  // Matematik.
  const mathResult = calculateMath(text);

  if (mathResult !== null) {
    return `Sonuç: ${mathResult} 🧮`;
  }

  // Selamlaşma.
  if (
    text === "selam" ||
    text === "merhaba" ||
    text === "sa" ||
    text.includes("selam kanka") ||
    text.includes("merhaba rivriv")
  ) {
    return "Aleyküm selam kanka! 😎 RivRiv hazır, ne yapıyoruz?";
  }

  if (
    text.includes("nasılsın") ||
    text.includes("naber")
  ) {
    return "İyidir kanka! ⚡ RivRiv görev başında. Sen nasılsın?";
  }

  // Asistanın kimliği.
  if (
    text.includes("adın ne") ||
    text.includes("kimsin") ||
    text.includes("sen nesin")
  ) {
    return "Ben RivRiv! 🤖 Senin kişisel asistanının ilk sürümüyüm.";
  }

  // Yardım.
  if (
    text === "yardım" ||
    text === "help" ||
    text.includes("ne yapabiliyorsun") ||
    text.includes("komutlar")
  ) {
    return "Şimdilik şunları yapabiliyorum:\n\n" +
      "⏰ Saat kaç?\n" +
      "📅 Bugünün tarihi ne?\n" +
      "🧮 25 * 4 kaç eder?\n" +
      "👋 Selam RivRiv\n" +
      "🔊 Bana sesli cevap ver\n\n" +
      "Bu sürüm henüz internete bağlı bir yapay zekâ değil. Onu sonraki aşamada ekleyeceğiz.";
  }

  // Sesli yanıtı kapatma.
  if (
    text.includes("sesi kapat") ||
    text.includes("sesli okumayı kapat")
  ) {
    speechSynthesis.cancel();
    return "Tamam kanka, sesli okumayı durdurdum. 🔇";
  }

  // Sesli yanıtı açma.
  if (
    text.includes("sesli konuş") ||
    text.includes("sesli cevap ver") ||
    text.includes("bana sesli cevap ver")
  ) {
    speak("Tamam kanka, bundan sonra cevaplarımı sesli okuyabilirim.");
    return "Sesli cevap özelliğini deniyorum. 🔊";
  }

  if (
    text.includes("teşekkür") ||
    text === "sağ ol" ||
    text === "eyvallah"
  ) {
    return "Ne demek kanka! 😎 Daha RivRiv'in başındayız.";
  }

  if (
    text.includes("görüşürüz") ||
    text.includes("bay bay")
  ) {
    return "Görüşürüz kanka! RivRiv burada olacak. 👋";
  }

  return "Mesajını aldım kanka! 🤖 Şu an yerel moddayım; henüz gerçek bir yapay zekâ bağlantım yok. 'Yardım' yazıp mevcut komutları görebilirsin.";
}

// Cevabı sesli oku.
function speak(text) {
  if (!("speechSynthesis" in window)) {
    return;
  }

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "tr-TR";
  utterance.rate = 1;
  utterance.pitch = 1;

  speechSynthesis.speak(utterance);
}

// Mesaj gönderme.
function sendMessage(text) {
  const cleanedText = text.trim();

  if (!cleanedText) {
    return;
  }

  addMessage(cleanedText, "user");
  messageInput.value = "";

  const reply = localReply(cleanedText);

  addMessage(reply, "assistant");

  // Yerel cevapları otomatik sesli okumak istersen aşağıdaki satırın
  // başındaki // işaretini kaldırabilirsin.
  // speak(reply);
}

// Form gönderimi.
if (chatForm) {
  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(messageInput.value);
  });
}

// Hazır komut butonları.
document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    sendMessage(button.dataset.prompt || button.textContent);
  });
});

// Sohbeti temizle.
if (clearButton) {
  clearButton.addEventListener("click", () => {
    messages.innerHTML = "";

    try {
      localStorage.removeItem("rivriv-chat");
    } catch (error) {
      console.warn("Sohbet temizlenemedi:", error);
    }

    addMessage("Sohbet temizlendi kanka. Yeni bir başlangıç! ✨");
  });
}

// Mikrofon / konuşma tanıma.
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition && voiceButton) {
  recognition = new SpeechRecognition();
  recognition.lang = "tr-TR";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening = true;

    if (voiceButtonText) {
      voiceButtonText.textContent = "Dinliyorum...";
    }

    if (assistantStatus) {
      assistantStatus.textContent = "Seni dinliyorum";
    }
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    sendMessage(transcript);
  };

  recognition.onerror = (event) => {
    console.warn("Mikrofon hatası:", event.error);

    if (assistantStatus) {
      assistantStatus.textContent =
        event.error === "not-allowed"
          ? "Mikrofon izni gerekli"
          : "Mikrofon kullanılamadı";
    }
  };

  recognition.onend = () => {
    isListening = false;

    if (voiceButtonText) {
      voiceButtonText.textContent = "Konuş";
    }

    if (assistantStatus) {
      assistantStatus.textContent = "Hazır";
    }
  };

  voiceButton.addEventListener("click", () => {
    if (isListening) {
      recognition.stop();
      return;
    }

    try {
      recognition.start();
    } catch (error) {
      console.warn("Mikrofon başlatılamadı:", error);
    }
  });
} else if (voiceButton) {
  voiceButton.disabled = true;

  if (voiceButtonText) {
    voiceButtonText.textContent = "Mikrofon desteklenmiyor";
  }
}

// Bağlantı göstergesi: Bu, yalnızca cihazın internet durumunu gösterir;
// bir yapay zekâ servisine bağlanıldığı anlamına gelmez.
function updateConnectionStatus() {
  if (connectionStatus) {
    connectionStatus.textContent = navigator.onLine
      ? "İnternet var · Yerel mod"
      : "Çevrimdışı · Yerel mod";
  }
}

window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);

loadChat();
updateConnectionStatus();
