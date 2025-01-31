import os from 'os';
import yn from 'yn';
import R from 'ramda';
import uniqid from 'uniqid';
import hashObj from 'object-hash';
import { serializeError } from 'serialize-error';
// import path from 'path';
// import { fork } from 'child_process';

import { getSync, setSync } from '../api/workspace/lib/globalConfig';
import { CLIArgs } from '../cli/command';
import {
  CLI_VERSION,
  CFG_ANALYTICS_ANONYMOUS_KEY,
  CFG_ANALYTICS_ENVIRONMENT_KEY,
  CFG_ANALYTICS_ERROR_REPORTS_KEY,
  CFG_ANALYTICS_REPORTING_KEY,
  CFG_ANALYTICS_USERID_KEY,
  CFG_USER_EMAIL_KEY,
  CFG_USER_NAME_KEY,
  DEFAULT_ENV,
} from '../constants';
import { analyticsPrompt, errorReportingPrompt } from '../prompts';

const LEVEL = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  FATAL: 'fatal',
};

class Breadcrumb {
  category: string;

  message: string;

  data: Record<string, any>;

  constructor(category: string, message: string, data: Record<string, any>) {
    this.category = category;
    this.message = message;
    this.data = data;
  }
}

class Analytics {
  static username: string;

  static command: string;

  static release: string;

  static args: CLIArgs;

  static flags: Record<string, any> = {};

  static success = true;

  static nodeVersion: string;

  static os: string;

  static extra: Record<string, any> | null | undefined = {};

  static level: keyof typeof LEVEL;

  static error: Error | string | Record<string, any>;

  static breadcrumbs: Array<Breadcrumb> = [];

  static analytics_usage: boolean;

  static error_usage: boolean;

  static anonymous: boolean;

  static environment: string;

  static getID(): string {
    const id = getSync(CFG_ANALYTICS_USERID_KEY);
    if (id) return id;
    const newId = uniqid();
    setSync(CFG_ANALYTICS_USERID_KEY, newId);
    return newId;
  }

  static promptAnalyticsIfNeeded(): Promise<void> {
    const cmd = process.argv.slice(2);
    function shouldPromptForAnalytics() {
      // do not prompt analytics approval for arco config command (so you can configure it in CI envs)
      if (cmd.length && cmd[0] !== 'config' && !process.env.CI) {
        const analyticsReporting = getSync(CFG_ANALYTICS_REPORTING_KEY);
        const errorReporting = getSync(CFG_ANALYTICS_ERROR_REPORTS_KEY);
        return R.isNil(analyticsReporting) && R.isNil(errorReporting);
      }
      return false;
    }

    if (shouldPromptForAnalytics()) {
      const uniqId = uniqid();
      if (!getSync(CFG_ANALYTICS_USERID_KEY)) setSync(CFG_ANALYTICS_USERID_KEY, uniqId);
      // @ts-ignore AUTO-ADDED-AFTER-MIGRATION-PLEASE-FIX!
      return analyticsPrompt().then(({ analyticsResponse }) => {
        setSync(CFG_ANALYTICS_REPORTING_KEY, yn(analyticsResponse));
        if (!yn(analyticsResponse)) {
          return errorReportingPrompt().then(({ errResponse }) => {
            return setSync(CFG_ANALYTICS_ERROR_REPORTS_KEY, yn(errResponse));
          });
        }
        return null;
      });
    }
    return Promise.resolve();
  }

  static _maskString(str: string): string {
    return str.replace(/[A-Za-z]/g, 'x');
  }

  static _hashLightly(value: any) {
    switch (typeof value) {
      case 'undefined':
      case 'number':
      case 'boolean':
        return value;
      case 'string':
        return this._maskString(value);
      case 'object':
        if (Array.isArray(value)) return value.map((item) => this._hashLightly(item));
        if (value === null) return value;
        return hashObj(value);
      default:
        return hashObj(value);
    }
  }

  static _hashFlags(flags: Record<string, any>) {
    const hashedFlags = {};
    const definedFlags = R.filter((flag) => typeof flag !== 'undefined', flags);
    if (this.anonymous && !R.isEmpty(definedFlags)) {
      Object.keys(definedFlags).forEach((key) => {
        hashedFlags[key] = this._hashLightly(flags[key]);
      });
      return hashedFlags;
    }
    return definedFlags;
  }

  static _hashArgs(args: CLIArgs): CLIArgs {
    if (!this.anonymous) return args;
    return args.map((arg) => this._hashLightly(arg));
  }

  static init(command: string, flags: Record<string, any>, args: CLIArgs) {
    this.anonymous = yn(getSync(CFG_ANALYTICS_ANONYMOUS_KEY), { default: true });
    this.command = command;
    this.flags = this._hashFlags(flags);
    this.release = CLI_VERSION;
    this.args = this._hashArgs(args);
    this.nodeVersion = process.version;
    this.os = process.platform;
    (this.level as any) = LEVEL.INFO;
    this.username = !this.anonymous
      ? getSync(CFG_USER_EMAIL_KEY) || getSync(CFG_USER_NAME_KEY) || os.hostname() || this.getID()
      : this.getID();
    this.analytics_usage = yn(getSync(CFG_ANALYTICS_REPORTING_KEY), { default: false });
    this.error_usage = this.analytics_usage
      ? true
      : yn(getSync(CFG_ANALYTICS_ERROR_REPORTS_KEY), { default: false });
    this.environment = getSync(CFG_ANALYTICS_ENVIRONMENT_KEY) || DEFAULT_ENV;
  }

  static sendData(): Promise<void> {
    // TODO data report
    // return new Promise((resolve, reject) => {
    //   if (this.analytics_usage || (this.error_usage && !this.success)) {
    //     const file = path.join(__dirname, 'analyticsSender.js');
    //     // switch to `false` to debug the child
    //     const forked = fork(file, { silent: true });
    //     forked.send(this.toObject());
    //     forked.on('message', () => {
    //       // makes sure the data has been sent to the child.
    //       // without it, when the message is large, it exits before the child got the complete message
    //       resolve();
    //     });
    //     forked.on('error', (err) => {
    //       reject(err);
    //     });
    //   } else {
    //     resolve();
    //   }
    // });
    return null;
  }

  static setError(level: string, err: Error): void {
    (this.level as string) = level;
    this.error = serializeError(err);
    this.success = false;
  }

  /**
   * eventually goes to the "ADDITIONAL DATA" section in Sentry
   */
  static setExtraData(key, value) {
    this.extra[key] = value;
  }

  static incExtraDataKey(key, value) {
    if (this.extra[key]) {
      this.extra[key] += value || 1;
    } else {
      this.extra[key] = value || 1;
    }
  }

  static hashData(data: any) {
    if (this.anonymous) {
      return hashObj(data);
    }
    return data;
  }

  static addBreadCrumb(category: string, message: string, data?: Record<string, any>) {
    this.breadcrumbs.push(new Breadcrumb(category, message, data));
  }

  static toObject() {
    return {
      username: this.username,
      command: this.command,
      flags: this.flags,
      args: this.args,
      release: this.release,
      extra: this.extra,
      nodeVersion: this.nodeVersion,
      os: this.os,
      level: this.level,
      error: this.error,
      success: this.success,
      breadcrumbs: this.breadcrumbs,
      analytics_usage: this.analytics_usage,
      error_usage: this.analytics_usage,
      environment: this.environment,
    };
  }
}

export { LEVEL, Analytics };
