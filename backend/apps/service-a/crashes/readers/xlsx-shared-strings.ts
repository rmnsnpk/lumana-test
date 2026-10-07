import { StringDecoder } from 'node:string_decoder';

import { SaxesParser } from 'saxes';
import { Open } from 'unzipper';

import { XLSX_SHARED_STRINGS_PATH } from '../consts/xlsx.consts.js';

export const readSharedStrings = async (path: string): Promise<string[]> => {
  const directory = await Open.file(path);
  const entry = directory.files.find((file) => file.path === XLSX_SHARED_STRINGS_PATH);

  if (!entry) return [];

  const strings: string[] = [];
  const parser = new SaxesParser();
  const decoder = new StringDecoder('utf8');
  let current: string | undefined;
  let inText = false;
  let phoneticDepth = 0;
  const append = (text: string) => {
    if (inText && current !== undefined) current += text;
  };

  parser.on('opentag', (tag) => {
    if (tag.name === 'si') current = '';
    else if (tag.name === 'rPh') phoneticDepth++;
    else if (tag.name === 't' && phoneticDepth === 0) inText = true;
  });
  parser.on('text', append);
  parser.on('cdata', append);
  parser.on('closetag', (tag) => {
    if (tag.name === 'si') {
      strings.push(current ?? '');
      current = undefined;
    } else if (tag.name === 'rPh') phoneticDepth--;
    else if (tag.name === 't') inText = false;
  });

  for await (const chunk of entry.stream()) parser.write(decoder.write(chunk as Buffer));
  parser.write(decoder.end()).close();

  return strings;
};
