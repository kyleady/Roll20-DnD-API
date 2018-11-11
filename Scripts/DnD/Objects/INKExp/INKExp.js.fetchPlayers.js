INKExp.fetchPlayers = () => {
  if(!state.INK_DATA) state.INK_DATA = {};
  if(!state.INK_DATA.Players) state.INK_DATA.Players = [];
  return state.INK_DATA.Players;
}
