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

import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import * as io from '@actions/io'
import * as core from '@actions/core'
import * as action from '../../src/action'
import * as gpgKeys from '../fixtures/gpg_private_keys'

jest.spyOn(core, 'debug').mockImplementation(jest.fn())
jest.spyOn(core, 'addPath').mockImplementation(jest.fn())
jest.spyOn(core, 'setFailed').mockImplementation(jest.fn())
jest.spyOn(core, 'info').mockImplementation(jest.fn())
jest.spyOn(core, 'saveState').mockImplementation(jest.fn())
jest.spyOn(core, 'exportVariable').mockImplementation(jest.fn())
const mockSetOutput = jest.spyOn(core, 'setOutput').mockImplementation(jest.fn())
const mockCoreSetSecret = jest.spyOn(core, 'setSecret').mockImplementation(jest.fn())

const runnerDir = path.join(__dirname, 'runner')
const toolsDir = path.join(runnerDir, 'tools')
const toolsTempDir = path.join(runnerDir, 'temp')

beforeAll(async () => {
  process.env.RUNNER_WORKSPACE = path.join(runnerDir)
  process.env.RUNNER_TOOL_CACHE = toolsDir
  process.env.RUNNER_TEMP = toolsTempDir
  process.env.INPUT_VERSION = '3.6.1'
  process.env.INPUT_FILE = 'tests/fixtures/sops_encrypted_file.yaml'
  process.env.INPUT_GPG_KEY = gpgKeys.base64_private_key1
})

afterAll(async () => {
  delete process.env.RUNNER_TOOL_CACHE
  delete process.env.RUNNER_TEMP
  delete process.env.INPUT_VERSION
  delete process.env.INPUT_GPG_KEY
  delete process.env.INPUT_FILE
  await io.rmRF(runnerDir)
})

describe('When the action is triggered with output not set', () => {
  beforeAll(async () => {
    await action.run()
  }, 100000)

  it('should set GNUPGHOME env variable with runner workspace', async () => {
    const dir = path.join(runnerDir)

    expect(process.env.GNUPGHOME).toBe(dir)
  })

  it('should download the given version of SOPS package', async () => {
    const dir = path.join(toolsDir, 'sops', '3.6.1', os.arch())

    expect(fs.existsSync(path.join(dir, 'sops'))).toBe(true)
  })

  it('should be able to set decrypted content as output', async () => {
    const expectedData = {
      Planet: 'earth',
      Hello: 'world'
    }

    expect(mockSetOutput).toHaveBeenCalledWith('data', expectedData)
    expect(mockCoreSetSecret).toHaveBeenCalledWith('earth')
    expect(mockCoreSetSecret).toHaveBeenCalledWith('world')
  })
})

describe('When the action is triggered with output set to dotenv', () => {
  beforeAll(async () => {
    process.env.INPUT_OUTPUT_TYPE = 'dotenv'

    await action.run()
  }, 100000)

  afterAll(async () => {
    delete process.env.INPUT_OUTPUT_TYPE
  })

  it('should set GNUPGHOME env variable with runner workspace', async () => {
    const dir = path.join(runnerDir)

    expect(process.env.GNUPGHOME).toBe(dir)
  })

  it('should download the given version of SOPS package', async () => {
    const dir = path.join(toolsDir, 'sops', '3.6.1', os.arch())

    expect(fs.existsSync(path.join(dir, 'sops'))).toBe(true)
  })

  it('should be able to set decrypted content as output', async () => {
    const expectedData = 'Planet=earth\nHello=world'

    expect(mockSetOutput).toHaveBeenCalledWith('data', expectedData)
    expect(mockCoreSetSecret).toHaveBeenCalledWith('earth')
    expect(mockCoreSetSecret).toHaveBeenCalledWith('world')
  })
})

describe('When the action is triggered with output set to yaml', () => {
  beforeAll(async () => {
    process.env.INPUT_OUTPUT_TYPE = 'yaml'

    await action.run()
  }, 100000)

  afterAll(async () => {
    delete process.env.INPUT_OUTPUT_TYPE
  })

  it('should set GNUPGHOME env variable with runner workspace', async () => {
    const dir = path.join(runnerDir)

    expect(process.env.GNUPGHOME).toBe(dir)
  })

  it('should download the given version of SOPS package', async () => {
    const dir = path.join(toolsDir, 'sops', '3.6.1', os.arch())

    expect(fs.existsSync(path.join(dir, 'sops'))).toBe(true)
  })

  it('should be able to set decrypted content as output', async () => {
    const expectedData = 'Planet: earth\nHello: world'

    expect(mockSetOutput).toHaveBeenCalledWith('data', expectedData)
    expect(mockCoreSetSecret).toHaveBeenCalledWith('earth')
    expect(mockCoreSetSecret).toHaveBeenCalledWith('world')
  })
})
