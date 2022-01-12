/**
 * Receives an array of headers and extract the value from the cookie header
 * 
 * @param  {String}   errors List of errors
 * @return {Object}
 */
export function getCookiesFromHeader(headers) {

  if (headers === null || headers === undefined || headers.Cookie === undefined) {
      return {};
  }

  const list = {},
      rc = headers.Cookie;

  rc && rc.split(';').forEach(function( cookie ) {
      const parts = cookie.split('=');
      const key = parts.shift().trim()
      const value = decodeURI(parts.join('='));
      if (key != '') {
          list[key] = value
      }
  });

  return list;
}