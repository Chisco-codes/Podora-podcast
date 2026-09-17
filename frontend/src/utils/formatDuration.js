function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) {
    return "—";
  }

  const totalMinutes = Math.round(minutes);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

export default formatDuration;