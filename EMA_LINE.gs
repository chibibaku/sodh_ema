// 環境変数
const LINE_TOKEN = PropertiesService.getScriptProperties().getProperty("LINE_TOKEN");
const DATA_API = PropertiesService.getScriptProperties().getProperty("DATA_API");
const LINE_URL = 'https://api.line.me/v2/bot/message/reply';


// LINEの緯度経度データをデータAPIに問い合わせる
function dataFetch(latitude, longitude){
  if (latitude == undefined || longitude == undefined) {
    return
  }else{
    const url = (
      DATA_API +
      "?" +
      `latitude=${latitude}&` +
      `longitude=${longitude}&` 
      );

    return(UrlFetchApp.fetch(url))
  }
}


// 避難所候補のメッセージを作成
function messaging(latitude, longitude) {
  const message = []
  const res = JSON.parse(
    dataFetch(
      latitude,
      longitude
      )
    )

  res.forEach((key) => {
    message.push(`避難所候補#${key.id}は${key.value.facility_name}で、経路はこちらです。\n${key.value.url}\n\n`);
    });

  const notice = "\
  避難する際は次のことに十分お気を付けください\n\n\
  \n\
  【津波】\n\
  ・海に近づかないでください\n\
  \n\
  【火災】\n\
  ・火災場所に近づかない\n\
  \n\
  【地割れ】\n\
  ・地割れが起きている場所には近づかないでください\n\
  \n\
  【液状化現象】\n\
  ・地盤の沈下などの恐れがあるため足元に注意してください\n\n\
  "

  return notice + message.join("")
}


// APIアクセスの受け取り
function doPost(e) {
  // JSONパース&データ取り出し
  const json = JSON.parse(e.postData.contents);
  const reply_token = json.events[0].replyToken;
  const messageType = json.events[0].message.type;

  // 検証への応答
  if (reply_token === 'underfined') {
    return;
  }
  
  // 位置情報への応答
  if (messageType == "location") {
    let reply_data = {
      'headers': {
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': 'Bearer ' + LINE_TOKEN,
      },
      'method': 'post',
      'payload': JSON.stringify({
        'replyToken': reply_token,
        'messages': [{
          'type': 'text',
          'text': messaging(
            json.events[0].message.latitude,
            json.events[0].message.longitude
            ),
        }],
      }),
    }
    UrlFetchApp.fetch(LINE_URL,reply_data);
  }
  
  // 例外時の終了
  return;
}