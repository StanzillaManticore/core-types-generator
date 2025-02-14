export function arrayToString(rows: string[]): string {
  // TODO : Remove line breaks
  return rows.filter((row) => row !== undefined && row !== null).join('\n');
}

export function getComment(content: string): string {
  return `--- ${content}`;
}

export function getAnnotation(type: string, ...args: string[]): string {
  return getComment(`@${type} ${args.join(' ')}`);
}

export function reservedNamesMapping(name: string): string {
  if (name === 'function') {
    return 'func';
  }

  return name;
}

export function typeMapping(type: string): string {
  if (type === undefined) return 'any';
  if (type === 'integer') {
    return 'number';
  }

  if (type === 'value') {
    return 'any';
  }

  if (type.includes('Array<')) {
    type = type.replace('Array<', 'table<number, ');
  }

  return type;
}
