// Local development entry point. On Vercel, api/index.js is used instead.
import app from './app.js';

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`GUTECH LMS API running on http://localhost:${port}`));
