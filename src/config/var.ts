import constant from './constant';

export default {
  serviceName: constant.serviceName,
  version: constant.version,
  startTime: new Date().toISOString(),
};