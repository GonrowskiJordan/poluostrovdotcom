// Usage
//  1. Enter sheet name where data is to be written below
var SHEET_NAME = "nominations";
        
//  2. Run > setup
//
//  3. Publish > Deploy as web app 
//    - enter Project Version name and click 'Save New Version' 
//    - set security level and enable service (most likely execute as 'me' and access 'anyone, even anonymously) 
//
//  4. Copy the 'Current web app URL' and post this in your form/script action 
//
//  5. Insert column names on your destination sheet matching the parameter names of the data you are passing in (exactly matching case)

var SCRIPT_PROP = PropertiesService.getScriptProperties(); // new property service

// If you don't want to expose either GET or POST methods you can comment out the appropriate function

function doPost(e) {
  Logger.log("JD: In doPost");
  Logger.log("JD: e: " + JSON.stringify(e));
  const json = handleResponse(e);
  return createCorsResponse(json);
}

function doGet(e) {
  Logger.log("JD: In doGet");
  Logger.log("JD: e: " + JSON.stringify(e));
  const json = handleResponse(e);
  return createCorsResponse(json);
}

function handleResponse(e) {
  // shortly after my original solution Google announced the LockService[1]
  // this prevents concurrent access overwritting data
  // [1] http://googleappsdeveloper.blogspot.co.uk/2011/10/concurrency-and-google-apps-script.html
  // we want a public lock, one that locks for all invocations
  Logger.log("JD: In handleResponse");
  Logger.log("JD: e: " + JSON.stringify(e));
  var lock = LockService.getPublicLock();
  lock.waitLock(30000);  // wait 30 seconds before conceding defeat.
  
  try {
    // next set where we write the data - you could write to multiple/alternate destinations
    var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
    var sheet = doc.getSheetByName(SHEET_NAME);
    
    // we'll assume header is in row 1 but you can override with header_row in GET/POST data
    var headRow = e.parameter.header_row || 1;
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var nextRow = sheet.getLastRow() + 1; // get next row
    var row = [];
    // loop through the header columns
    var debug_log = '';
    for (i in headers) {
      if (headers[i] == "Timestamp") {
        // special case if you include a 'Timestamp' column
        row.push(new Date());
      } else { // else use header name to get data
        row.push(e.parameter[headers[i]]);
      }
    }
    // more efficient to set values as [][] array than individually
    sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);
    // return json success results
    return JSON.stringify({"result":"success", "row": nextRow});
  } catch(e) {
    // if error return this
    return JSON.stringify({"result":"error", "error": e});
  } finally { //release lock
    lock.releaseLock();
  }
}

function createCorsResponse(content) {
  return ContentService.createTextOutput(content)
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function setup() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  SCRIPT_PROP.setProperty("key", doc.getId());
}