const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const html = fs.readFileSync(path.join(__dirname, 'programa_educativo.html'), 'utf-8');
const $ = cheerio.load(html);

console.log("=== Titles/Headers ===");
$('h1, h2, h3, h4').each((i, el) => {
    if (i < 20) console.log($(el).text().trim().replace(/\n/g, ' '));
});

console.log("\n=== Possible Links/Items ===");
$('a').each((i, el) => {
    const text = $(el).text().trim().replace(/\n/g, ' ');
    const href = $(el).attr('href');
    if (text && href && !href.startsWith('#') && i < 30) {
        console.log(`${text} -> ${href}`);
    }
});

console.log("\n=== Checking for Specific Classes ===");
const cards = $('.card').length;
console.log(`Number of .card elements: ${cards}`);

// Let's see the first few cards if any
$('.card').each((i, el) => {
    if (i < 3) {
        console.log(`\nCard ${i + 1}:`);
        console.log($(el).text().trim().replace(/\s+/g, ' ').substring(0, 200));
    }
});
