const formatNumber = n => {
  n = n.toString();
  return n[1] ? n : '0' + n;
};

const formatTime = date => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute].map(formatNumber).join(':');
};

const formatDate = date => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return [year, month, day].map(formatNumber).join('/');
};

const timeAgo = timestamp => {
  const now = Date.now();
  const t = new Date(timestamp).getTime();
  const diff = Math.floor((now - t) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  if (diff < 604800) return Math.floor(diff / 86400) + '天前';
  return formatDate(timestamp);
};

module.exports = {
  formatTime,
  formatDate,
  timeAgo
};