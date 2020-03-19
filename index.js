const request = require('request');
const cheerio = require('cheerio');
const stringify = require('csv-stringify');
var fs = require('fs');

//config for baseURL and timer
const config = {
  timeGapBetweenCalls: 3000,
  baseScrapeURL: 'https://www.bookshare.org/search?keyword=',
};

//ISBN number list
const isbnList = require('./data');
//Column Header for CSV file
const columns = {
  ISBN: 'ISBN',
  Synopsis: 'Synopsis',
};
//Temp data
let data = [];

const callData = (_isbn, index) => {
  request(`${config.baseScrapeURL}${_isbn}`, (err, response, html) => {
    console.log('ISBN', _isbn, ', Index', index);
    if (!err && response.statusCode == 200) {
      const $ = cheerio.load(html);
      const results = $('#searchResults');
      if (results && results.html()) {
        const temp = cheerio.load(results.html());
        const bookUrl = temp('a').attr('href');
        if (bookUrl) {
          request(bookUrl, (err, response, html) => {
            console.log('error', err);
            if (!err && response.statusCode == 200) {
              const $book = cheerio.load(html);
              const bookData = $book('.bookMetadata');
              const dataToWrite = bookData
                .children('dd[itemprop="description"]')
                .text()
                .trim()
                .toString();
              data.push([_isbn, dataToWrite]);
              //When index == length-1 means last call invoking write to csvfile
              if (index == isbnList.length - 1) {
                writeToFile();
              }
            }
          });
        }
      }
    } else {
      console.log(err);
    }
  });
};

const writeToFile = () => {
  stringify(data, { header: true, columns: columns }, (err, output) => {
    if (err) throw err;
    fs.writeFile('bookData.csv', output, 'utf8', function(err) {
      if (err) {
        console.log(
          'Some error occured - file either not saved or corrupted file saved.'
        );
      } else {
        console.log('Data saved to bookData.csv successfully!');
      }
    });
  });
};

isbnList.forEach((_isbn, index) => {
  setTimeout(() => {
    callData(_isbn, index);
  }, index * config.timeGapBetweenCalls);
});
