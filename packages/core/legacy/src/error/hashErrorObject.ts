import yn from 'yn';
import hash from 'object-hash';

import logger from '../logger/logger';
import { getSync } from '../api/workspace/lib/globalConfig';
import { CFG_ANALYTICS_ANONYMOUS_KEY } from '../constants';
import cloneErrorObject, { systemFields } from './cloneErrorObject';

export default function hashErrorIfNeeded(error: Error) {
  let clonedError = error;
  try {
    clonedError = cloneErrorObject(error);
  } catch (e: any) {
    logger.warn('could not clone error', error);
  }

  const shouldHash = yn(getSync(CFG_ANALYTICS_ANONYMOUS_KEY), { default: true });
  if (!shouldHash) return clonedError;
  const fields = Object.getOwnPropertyNames(clonedError);
  const fieldToHash = fields.filter(
    (field) => !systemFields.includes(field) && field !== 'message'
  );
  if (!fieldToHash.length) return clonedError;

  fieldToHash.forEach((field) => {
    try {
      clonedError[field] = hashValue(clonedError[field]);
    } catch (e: any) {
      logger.debug(`could not hash field ${field}`);
    }
  });

  return clonedError;
}

function hashValue(value: any): string {
  if (!value) return value;
  const type = typeof value;
  switch (type) {
    case 'undefined':
    case 'number':
    case 'boolean':
      return value;
    case 'object':
      // @ts-ignore
      if (Array.isArray(value)) return value.map((v) => hash(v));
      // ignoreUnknown helps to not throw error for some errors with custom props.
      return hash(value, { ignoreUnknown: true });
    default:
      return hash(value);
  }
}
