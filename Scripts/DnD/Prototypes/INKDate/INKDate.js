function INKDate(options) {
  this.Year = 0;
  this.Month = 0;
  this.Day = 0;

  if(options) {
    this.setDate(options);
  } else {
    this.fetchDate();
  }
}
