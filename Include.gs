// Code shared by Bruce Mcpherson http://ramblings.mcpher.com/Home/excelquirks/bigapps/bigquiz/include

/**
 *used to include code in htmloutput
 *@nameSpace Include
 */
var Include = (function (ns) {
  
  /**
  * given an array of .gs file names, it will get the source and return them concatenated for insertion into htmlservice
  * like this you can share the same code between client and server side, and use the Apps Script IDE to manage your js code
  * @param {string[]} scripts the names of all the scripts needed
  * @return {string} the code inside script tags
  */
  ns.gs =  function (scripts) {
    return '<script>\n' + scripts.map (function (d) {
      // getResource returns a blob
      return ScriptApp.getResource(d).getDataAsString();
    })
    .join('\n\n') + '</script>\n';
  };

  /**
  * given an array of .html file names, it will get the source and return them concatenated for insertion into htmlservice
  * @param {string[]} scripts the names of all the scripts needed
  * @param {string} ext file extendion
  * @return {string} the code inside script tags
  */
  ns.html = function (scripts, ext) {
    return  scripts.map (function (d) {
      return HtmlService.createTemplateFromFile(d+(ext||''))
      .evaluate().getContent();
    })
    .join('\n\n');
  };
  
  /**
  * given an array of .html file names, it will get the source and return them concatenated for insertion into htmlservice
  * inserts css style
  * @param {string[]} scripts the names of all the scripts needed
  * @return {string} the code inside script tags
  */
  ns.js = function (scripts) {
    return '\n' + ns.html(scripts,'.js') + '\n';
  };
  
  /**
  * given an array of .html file names, it will get the source and return them concatenated for insertion into htmlservice
  * like this you can share the same code between client and server side, and use the Apps Script IDE to manage your js code
  * @param {string[]} scripts the names of all the scripts needed
  * @return {string} the code inside script tags
  */
  ns.css = function (scripts) {
    return '<style>\n' + ns.html(scripts,'.css') + '</style>\n';
  };
  
  /**
  * given an image object, it will generate an img tag 
  * @param {Object} imgData with image data
  * @return {string} of img tag or src
  */
  ns.img = function (imgData, isImgTag) {
    if (!isImgTag){
      var html = '<img ';
      Object.entries(imgData).forEach(function(k){ html += k[0]+'="'+k[1]+'" '});
      html += '>\n'
      return html
    } else {
      return imgData.src;
    } 
  };
  

  return ns;
})(Include || {});

if (!Object.entries)
  Object.entries = function( obj ){
    var ownProps = Object.keys( obj ),
        i = ownProps.length,
        resArray = new Array(i); // preallocate the Array
    while (i--)
      resArray[i] = [ownProps[i], obj[ownProps[i]]];
    
    return resArray;
  };