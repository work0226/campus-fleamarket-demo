const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { fileID } = event;
  if (!fileID) return { code: -1, message: '缺少 fileID' };

  const res = await cloud.getTempFileURL({
    fileList: [fileID]
  });

  const info = res.fileList && res.fileList[0];
  return {
    code: 0,
    fileID,
    tempURL: info ? info.tempFileURL : '',
    url: info ? info.tempFileURL : ''
  };
};