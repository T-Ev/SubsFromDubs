document.getElementById("create-room").addEventListener("click", () => {
  const roomId = Math.random().toString(36).substring(2, 15);
  window.location.href = `/r?room=${roomId}&master=1`;
});
