import express from 'express';
import { evaluate } from '@featuregate/evaluator';

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  const result = evaluate(); // Returns "evaluator works"
  res.send(`Server says: ${result}`);
});

app.listen(port, () => {
  console.log(`API Server running on http://localhost:${port}`);
});
