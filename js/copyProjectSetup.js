#!/usr/bin/env node

'use strict';

const { resolve } = require('path');

const program = require('commander');

const { asyncForIn, copy, getServiceSpecs, rmrf } = require('./utils');

// -- Constants --------------- --- --  -

const PROD_COMPOSE_FILE = 'dc.prod.yml';
const COMPOSE_FILE = process.env.COMPOSE_FILE || PROD_COMPOSE_FILE;

// -- copyProjectSetup --------------- --- --  -

/**
 * Copies the project setup directory in each front image build context, such that it can be
 * included in the image (at build-time and be available when packing the frontend content).
 *
 * @param {string} [composeFile] - The name of the Compose file to use. Defaults to the value of the
 *   `COMPOSE_FILE` environment variable, or `dc.prod.yml`.
 *
 * @returns {Promise.<string[]>}
 */
async function copyProjectSetup({ args: serviceNames, clean, composefile }) {
  // console.log('>> copyProjectSetup - ', { clean, composefile, serviceNames });
  const services = await getServiceSpecs(resolve(composefile));
  if (clean) {
    await asyncForIn(services, async (serviceSpec) => {
      if (serviceSpec.build && serviceSpec.build.context) {
        await rmrf(resolve(serviceSpec.build.context, '__project_setup__')); //.catch(() => null);
      }
    });
  }
  else if (serviceNames.length > 0) {
    await asyncForIn(serviceNames, async (serviceName) => {
      const serviceSpec = services[serviceName];
      if (serviceSpec) {
        if (serviceSpec.build && serviceSpec.build.context) {
          await copy('setup', resolve(serviceSpec.build.context, '__project_setup__'), {
            preserveTimestamps: true
          }); //.catch(() => null);
        }
      }
      else {
        throw new Error(`There is no '${serviceName}' service.`);
      }
    });
  }
  else {
    await asyncForIn(services, async (serviceSpec) => {
      if (serviceSpec.build && serviceSpec.build.context) {
        await copy('setup', resolve(serviceSpec.build.context, '__project_setup__'), {
          preserveTimestamps: true
        }); //.catch(() => null);
      }
    });
  }
}

// -- CLI --------------- --- --  -

program
  .version('0.1.0')
  .usage('[options] <service ...>')
  .option('--clean', `Remove the temporary copies.`)
  .option('--composefile [path]', `Specify the Compose file to use [${COMPOSE_FILE}].`, COMPOSE_FILE)
  .parse(process.argv);

copyProjectSetup(program)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
