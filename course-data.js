window.CourseData = {
  "1": {
    theme: "blue",
    review: {
      title: "課後回顧：0 與 1 能做什麼？",
      reflections: ["我能說明：一個位元為什麼只有兩種狀態。", "我能計算：二進位 10110 代表多少。", "我能連結：今天的練習如何對應電腦中的資料。"],
      badge: "🏅 位元觀察員徽章已解鎖！",
      questions: [
        { question: "一個位元可表示幾種狀態？", choices: [{ label: "10 種", correct: false, hint: "位元只有 0 與 1 兩種狀態。" }, { label: "2 種", correct: true }] },
        { question: "二進位 10110 是多少？", choices: [{ label: "22", correct: true }, { label: "18", correct: false, hint: "從左到右加總 16、4、2：16 + 4 + 2 = 22。" }] },
        { question: "最右邊位元的權值是？", choices: [{ label: "16", correct: false, hint: "二進位由右往左的權值是 1、2、4、8、16。" }, { label: "1", correct: true }] }
      ]
    },
    discussion: { scenario: "要用 5 個位元表示「一個月有幾天」，你會怎麼做？", choices: ["用 0 與 1 組合出 28～31", "直接記錄十進位數字"] }
  },
  "2": {
    theme: "indigo",
    review: {
      title: "課後回顧：文字需要一份共同的暗號本。",
      reflections: ["我能解釋：沒有共同編碼時，訊息為何可能被誤解。", "我能舉例：一個字元如何被轉成位元組合。", "我能比較：不同編碼為何需要共存與演進。"],
      badge: "🏅 編碼解讀員徽章已解鎖！",
      questions: [
        { question: "解碼摩斯密碼時，字母間要靠什麼區分？", choices: [{ label: "停頓／空白", correct: true }, { label: "點的數量", correct: false, hint: "點和劃組成一個字母；字母之間要以停頓或空白分開。" }] },
        { question: "為什麼雙方需要共同編碼？", choices: [{ label: "讓檔案變大", correct: false, hint: "編碼規則不同時，同一串資料可能被解讀成不同字元。" }, { label: "正確解讀訊息", correct: true }] },
        { question: "摩斯密碼的基本符號是？", choices: [{ label: "點與劃", correct: true }, { label: "0 與 1", correct: false, hint: "摩斯密碼以點（.）與劃（-）組成。" }] }
      ]
    },
    discussion: { scenario: "班上要傳送含有表情符號的新訊息，你會優先選擇哪種做法？", choices: ["採用支援更多字元的共同編碼", "每個人自行約定符號"] }
  },
  "3": {
    theme: "teal",
    review: {
      title: "課後回顧：把連續聲音變成數位資料。",
      reflections: ["我能區分：響度、音高與音色分別對應什麼特徵。", "我能說明：取樣率與位元深度各影響什麼。", "我能選擇：依情境挑選合適的聲音格式。"],
      badge: "🏅 數位聲音觀察員徽章已解鎖！",
      questions: [
        { question: "聲音的響度主要對應？", choices: [{ label: "振幅大小", correct: true }, { label: "波形密度", correct: false, hint: "波形越高，代表振幅越大，聽起來通常越大聲。" }] },
        { question: "取樣點變少時，常見結果是？", choices: [{ label: "保留更多細節", correct: false, hint: "取樣點不足會讓原本的連續波形失去細節。" }, { label: "失去波形細節", correct: true }] },
        { question: "想節省音訊容量可優先選？", choices: [{ label: "WAV", correct: false, hint: "WAV 保留原始資料，容量通常較大。" }, { label: "MP3", correct: true }] }
      ]
    },
    discussion: { scenario: "要把一段訪談上傳到網路，你會優先採用哪種格式？", choices: ["MP3：兼顧容量與聆聽需求", "WAV：保留更多原始細節"] }
  },
  "4": {
    theme: "rose",
    review: {
      title: "課後回顧：一張圖片如何變成資料？",
      reflections: ["我能區分：解析度、色彩深度與檔案大小並不相同。", "我能說明：降低色彩或尺寸為何能減少檔案容量。", "我能選擇：依透明背景、照片或動畫挑選圖片格式。"],
      badge: "🏅 圖像資料判讀員徽章已解鎖！",
      questions: [
        { question: "透明背景的圖示優先選？", choices: [{ label: "JPG", correct: false, hint: "JPG 不支援透明背景；需要透明效果時選 PNG。" }, { label: "PNG", correct: true }] },
        { question: "想讓照片檔案較小可優先選？", choices: [{ label: "JPG", correct: true }, { label: "PNG", correct: false, hint: "PNG 適合線條與透明圖；照片通常選 JPG 更省容量。" }] },
        { question: "降低解析度通常會？", choices: [{ label: "檔案更大", correct: false, hint: "解析度較低時，像素變少，檔案通常會變小。" }, { label: "像素與容量變少", correct: true }] }
      ]
    },
    discussion: { scenario: "要製作透明背景的社團 Logo 並放上網站，你會怎麼選？", choices: ["PNG：保留透明背景與清楚邊緣", "JPG：把照片壓縮得更小"] }
  }
};
