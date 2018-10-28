INKDate.prototype.save = function() {
  if(!state.INK_DATA) state.INK_DATA = {};
  state.INK_DATA.Year = this.Year;
  state.INK_DATA.Month = this.Month;
  state.INK_DATA.Day = this.Day;
}
