// データキャッシュ用
const cache = CacheService.getScriptCache();
var cached = null;


// HTTP/GETを受け取ったとき
function doGet(e) {
  // ペイロードのJSONを作成
  payload = JSON.stringify(
    // 子関数発火
    calculation(
      e.parameter.latitude,
      e.parameter.longitude
    )
  )

  // APIの応答
  return (
    ContentService.createTextOutput()
      .setMimeType(ContentService.MimeType.JSON)
      .setContent(payload)
  );
}


// 距離計算関数
function calculation(start_latitude, start_longitude) {
  // レスポンス用の配列を作成
  const infoArray = [];

  // オープンデータを取得・パース
  const jsonRecord = (() => {
    const jsonText = fetch().getContentText("UTF-8");
    return JSON.parse(jsonText).result.records;
  })();

  // 取得した配列のレコード毎に実行
  jsonRecord.forEach(record => {
    // レコードのデータ読み出し
    const facility_id = record._id;
    const facility_name = record.施設名;
    const goal_latitude = record.緯度;
    const goal_longitude = record.経度;

    // 緯度経度が存在するか確認
    if (goal_latitude !== undefined && goal_longitude !== undefined) {
      // ユークリッド距離の計算
      const distance = Math.sqrt(
        Math.pow(
          goal_latitude - start_latitude, 2
        ) + 
        Math.pow(
          goal_longitude - start_longitude, 2
        )
      );
      
      // 発行するGoogleMapURLのテンプレート
      const url = `https://www.google.com/maps/dir/${start_latitude}+${start_longitude}/${goal_latitude}+${goal_longitude}/`;
      
      // 配列に新規項目追加
      infoArray.push({
          facility_id,
          facility_name,
          goal_latitude,
          goal_longitude,
          distance,
          url
        }
      );
    }
  });

  // 距離の近い順にソート
  infoArray.sort((a,b)=> a.distance - b.distance);

  // 付与idの初期化
  let id = 1;

  const response = [];

  // 配列を呼び出しidを付与
  infoArray.forEach(infoArray => {
    response.push({
      "id": id,
      "value": infoArray
    });
    id=id+1;
  });
  
  // 上位3件の取得
  return response.slice(0, 3)
}


// 
function fetch() {
  // オープンデータの問い合わせ先情報(環境変数)
  const uri = PropertiesService.getScriptProperties().getProperty("OPENDATA_URL");
  const param = {
    'resource_id': PropertiesService.getScriptProperties().getProperty("RESOURCE_ID"),
    'limit': PropertiesService.getScriptProperties().getProperty("FETCH_LIMIT"),
  }

  // UrlFetchAppのオプション
  const options = {
    'method': 'get',
    'payload': param,
    "muteHttpExceptions" : true,
    "validateHttpsCertificates" : false,
    "followRedirects" : false
  }

  // キャッシュの存在を確認
  if (cache.get("apires") !== null) {
    console.info("Cache found. Retrun cached data...")
    return cache.get("apires");
    };
  
  // キャッシュがなければ取得
  try {
    console.info("Cache not found. Request and saveing new data...");
    const res = UrlFetchApp.fetch(uri, options);
    cache.put('apires', res);
    return(res)
  } catch(e) {
    // 例外エラー処理
    Logger.log('Error:')
    Logger.log(e)
  }
}