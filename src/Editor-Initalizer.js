
// ---- Array extensions ----
Array.prototype.rotate = function (n) {
  n = n % this.length;
  if (n < 0) n += this.length;
  return this.slice(n).concat(this.slice(0, n));
};

Array.prototype.peek = function (n) {
  n = n % this.length;
  if (n < 0) n += this.length;
  return this[Math.floor(n)];
};

Array.prototype.poke = function (n, v) {
  n = n % this.length;
  if (n < 0) n += this.length;
  const temp = this[n];
  this[Math.floor(n)] = v;
  return temp;
};
