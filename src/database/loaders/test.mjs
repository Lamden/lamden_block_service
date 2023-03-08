import fs from 'fs';
import path from 'path';

const openFile = async () => {
  try {
    const filePath = path.resolve(__dirname, '..', 'missing_hashes.json');
    const data = await fs.promises.readFile(filePath, 'utf8');
    const array = JSON.parse(data);
    return array;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

openFile().then((array) => {
    // Do something with the array
  }).catch((error) => {
    // Handle the error
  });