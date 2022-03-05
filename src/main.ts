type Bukken = {
  id: string;
  name: string;
  roomCount: number;
  bukkenUrl: string;
};

const getBukkenList = (prefecture: string, area: string, retry: number = 1) => {
  for (let i = 0; i < retry; i++) {
    const url =
      "https://chintai.sumai.ur-net.go.jp/chintai/api/bukken/search/list_bukken/";
    const data = `rent_low=&rent_high=&floorspace_low=&floorspace_high=&tdfk=${prefecture}&area=${area}`;
    const response = UrlFetchApp.fetch(url, {
      method: "post",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      payload: data,
    });

    if (response.getResponseCode() == 200) {
      return JSON.parse(response.getContentText()) as Bukken[];
    }
  }

  return null;
};

const getPrevData = (): Record<string, string> => {
  const scriptProperties = PropertiesService.getScriptProperties();
  const data = scriptProperties.getProperties();
  return data;
};

const saveData = (data: Record<string, string>) => {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperties(data);
};

const sendMail = (to: string, subject: string, body: string) => {
  GmailApp.sendEmail(to, subject, body);
};

const main = () => {
  const bukkens = getBukkenList("11", "02");

  if (bukkens == null) return;

  const prev = getPrevData();

  const diff = [];

  for (const bukken of bukkens) {
    const { id, name, roomCount, bukkenUrl } = bukken;

    const exist = Object.prototype.hasOwnProperty.call(prev, id);

    if ((!exist || prev[id] !== roomCount.toString()) && roomCount) {
      diff.push({
        id,
        name,
        roomCount,
        bukkenUrl: `https://www.ur-net.go.jp${bukkenUrl}`,
        prev: prev[id],
      });
    }
  }

  const filteredDiff = diff.filter(({ id }) => BUKKEN_IDS.includes(id));

  if (filteredDiff.length > 0) {
    const subject = "UR物件変更通知";
    const body = filteredDiff
      .map(
        ({ id, name, roomCount, bukkenUrl, prev }) =>
          `${name}: ${prev} => ${roomCount}\n${bukkenUrl}`
      )
      .join("\n");

    sendMail(RECIPIENTS.join(", "), subject, body);
  }

  saveData(
    Object.fromEntries(
      bukkens.map(({ id, roomCount }) => [id, roomCount.toString()])
    )
  );
};
