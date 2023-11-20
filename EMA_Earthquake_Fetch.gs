// 環境変数
const LINE_TOKEN = PropertiesService.getScriptProperties().getProperty("LINE_TOKEN");
const IS_DEBUG = PropertiesService.getScriptProperties().getProperty("IS_DEBUG");
const LINE_URL = "https://api.line.me/v2/bot/message/broadcast";

let psot_data = {
    "headers": {
      "Content-Type": "application/json; charset=UTF-8",
      "Authorization": "Bearer " + LINE_TOKEN,
    },
    "method": "post",
    "payload": JSON.stringify({
      "messages": [{
        "type": "text",
        "text": "【テスト】\n\n札幌市内で震度4以上の地震を観測しました。\n必要に応じて避難を検討してください。\n\n避難所を探す場合、以下のボタンよりあなたの現在位置を送信できます。現在位置から最も近い避難所をお知らせします。【テスト】",
        "quickReply": {
          "items": [
            {
              "type": "action",
              "action": {
                "type": "location",
                "label": "避難所を探す"
              }
            }
          ]
        }
      }],
    }),
  }


// 定期実行関数 1分毎に実行するよう設定すること
function timerActivity(){
  const currentData = getEartuQuakes()
  currentData.forEach((data) => {
    if(data[1] == "北海道札幌市" && data[2] >= 4){
      console.warn("Triggering LINE broadcast API.")
      UrlFetchApp.fetch(LINE_URL,psot_data);
    }
   }
  )

}

// 地震情報取得
function getEartuQuakes(){
  // ネームスペース
  const atom = XmlService.getNamespace("", "http://www.w3.org/2005/Atom");
  const seismology1 = XmlService.getNamespace("", "http://xml.kishou.go.jp/jmaxml1/body/seismology1/")

  // コンテンツ取得
  const res = UrlFetchApp.fetch("https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml")
  const xml = XmlService.parse(res.getContentText())
  const root = xml.getRootElement()
  const entries = root.getChildren("entry", atom)
  const earthQuakeContents = entries.filter(entry => {
    const content = entry.getChildText("content", atom)
    return /震度情報/.test(content)
  })

  // 地震がない時
  if(!earthQuakeContents?.length){
    return null
  }

  const targetEarthQuakes = earthQuakeContents.map(e => {
    // 対象地震詳細情報取得
    const link = e.getChild("link", atom).getAttribute("href").getValue()
    const res = UrlFetchApp.fetch(link)
    const xml = XmlService.parse(res.getContentText())
    const root = xml.getRootElement()
    const bodies = root.getChildren("Body", seismology1)
    const earthQuake = bodies[0].getChild("Earthquake", seismology1)
    const intensity = bodies[0].getChild("Intensity", seismology1)

    
    // 発生時刻
    const originTime = new Date(earthQuake?.getChildText("OriginTime", seismology1))
    
    
    // 発生場所
    const location = []
    const prefs = intensity
      ?.getChild("Observation", seismology1)
      .getChildren("Pref", seismology1)
      .map((prefElement) => {
        return prefElement.getChild("Name", seismology1).getText();
      });
    const cities =  intensity
      ?.getChild("Observation", seismology1)
      .getChildren("Pref", seismology1)
      .map((prefElement) =>{
        prefElement
          .getChild("Area", seismology1)
          .getChildren("City", seismology1)
          .map((cityElement) => {
            location.push(prefs[0]+cityElement.getChild("Name", seismology1).getText())
          });
      })
    
    
    // 震度
    const maxInt = intensity?.getChild("Observation", seismology1).getChildText("MaxInt", seismology1)

    
    // 「発生時刻・発生場所・震度」がなければreturn
    if(!earthQuake || !intensity){
      return null
    }

    return [
      originTime,
      location,
      maxInt
    ]
  }).filter(e => e)

  
  // デバッグ用 フラグが立っていれば札幌に震度127の地震が起きた想定のデータを挿入
  if(IS_DEBUG == true){
    targetEarthQuakes.push([ new Date("1970-01-01T00:00:01+09:00"), [ "北海道札幌市" ], "127" ])
  }

  return targetEarthQuakes  
}