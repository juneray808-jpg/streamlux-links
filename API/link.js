export default function handler(req, res) {
  const { id } = req.query;

  const appLink = `streamlux://video/${id}`;
  const fallback = `https://streamlux.io/download`;

  // Try to open app
  res.writeHead(302, {
    Location: appLink,
  });

  res.end();
}
