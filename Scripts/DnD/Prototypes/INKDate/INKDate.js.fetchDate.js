INKDate.prototype.fetchDate = function() {
  if(!state.INK_DATA) state.INK_DATA = {};
  this.Year = state.INK_DATA.Year || 0;
  this.Month = state.INK_DATA.Month || 0;
  this.Day = state.INK_DATA.Day || 0;
}
