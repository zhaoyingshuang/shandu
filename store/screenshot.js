const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new'
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });

  const filePath = path.resolve(__dirname, 'screenshots.html');
  await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0' });

  const sections = await page.$$('.screenshot');

  for (let i = 0; i < sections.length; i++) {
    await sections[i].screenshot({
      path: path.resolve(__dirname, `screenshot-${i + 1}.png`),
      type: 'png'
    });
    console.log(`截图 ${i + 1} 已保存: screenshot-${i + 1}.png`);
  }

  await browser.close();
  console.log(`完成！共 ${sections.length} 张截图 (1280x800)`);
})();
