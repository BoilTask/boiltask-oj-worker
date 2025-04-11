// 解码 base64 编码内容
function decodeBase64(base64Content) {
  return decodeURIComponent(escape(atob(base64Content)));
}
