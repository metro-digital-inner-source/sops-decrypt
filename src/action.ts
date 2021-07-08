/*
 * Copyright 2021 METRO Digital GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as core from '@actions/core'
import { InputOptions } from '@actions/core'
import * as fs from 'fs'
import * as gpg from './gpg'
import * as sops from './sops'
import * as envfile from 'envfile'
import * as yaml from 'js-yaml'

export async function run () {
  try {
    process.env.GNUPGHOME = process.env.RUNNER_WORKSPACE
    core.exportVariable('GNUPGHOME', process.env.GNUPGHOME)
    const required: InputOptions = {
      required: true
    }
    const version: string = core.getInput('version', required)
    const gpgKey: string = core.getInput('gpg_key', required)
    const encryptedFile: string = core.getInput('file', required)
    const outputType: string = core.getInput('output_type')
    const outputFormat = await sops.getOutputFormat(outputType)
    const sopsPath = await sops.install(version, fs.chmodSync)
    await gpg.importKey(gpgKey)
    let result: string = await sops.decrypt(sopsPath, encryptedFile, outputFormat)

    hideSecrets(result, outputFormat)
    if (outputFormat === sops.OutputFormat.JSON) {
      result = JSON.parse(result)
    }

    core.setOutput('data', result)
  } catch (error) {
    core.setFailed(`Failed decrypting the file: ${error.message}`)
  }
}

function hideSecrets (result: string, outputFormat: string) :void {
  let obj: any

  if (outputFormat === sops.OutputFormat.JSON) {
    obj = JSON.parse(result)
  } else if (outputFormat === sops.OutputFormat.YAML) {
    obj = yaml.load(result)
  } else if (outputFormat === sops.OutputFormat.DOTENV) {
    obj = envfile.parse(result)
  }

  for (const property in obj) {
    const val = '' + obj[property]
    if (val.indexOf('\n') === -1) {
      core.setSecret(val)
    } else {
      // setSecret does not support multiline strings
      for (const line of val.split('\n')) {
        core.setSecret(line)
      }
    }
  }
}
