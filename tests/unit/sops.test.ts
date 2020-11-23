import * as sops from '../../src/sops';
import * as command from '../../src/command';
import * as core from '@actions/core';
import * as toolsCache from '@actions/tool-cache';
import { mocked } from 'ts-jest/utils';

jest.mock('@actions/core')
jest.mock('@actions/tool-cache')
jest.mock('../../src/command')
jest.mock('../../src/gpg')

let mockCacheFile: jest.Mock
let mockDownloadTool: jest.Mock
let mockFindTool: jest.Mock
let mockAddPath: jest.Mock
let mockExecutePermission: jest.Mock
let mockExec: jest.Mock

beforeEach(()=>{
  mockCacheFile = mocked(toolsCache.cacheFile, true)
  mockDownloadTool = mocked(toolsCache.downloadTool, true)
  mockFindTool = mocked(toolsCache.find, true)
  mockAddPath = mocked(core.addPath, true)
  mockExecutePermission = jest.fn()
  mockExec = mocked(command.exec, true)
})

afterEach(()=>{
  mockCacheFile.mockReset()
  mockDownloadTool.mockReset()
  mockFindTool.mockReset()
  mockAddPath.mockReset()
  mockExecutePermission.mockReset()
  mockExec.mockReset()
})

describe('When getting the download URL for SOPS', () => {
  let originalPlatform: string
  beforeEach(() => {
    originalPlatform = process.platform;
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform
    });
  });

  it('should get the right URL for windows platform', () => {
    const version = '3.6.1';
    setPlatform('win32')
    let expectedURL = `https://github.com/mozilla/sops/releases/download/v${version}/sops-v${version}.exe`

    let actualURL = sops.downloadURL(version)

    expect(actualURL).toEqual(expectedURL)
  })

  it('should get the right URL for linux platform', () => {
    const version = '3.6.1';
    setPlatform('linux')
    let expectedURL = `https://github.com/mozilla/sops/releases/download/v${version}/sops-v${version}.linux`

    let actualURL = sops.downloadURL(version)

    expect(actualURL).toEqual(expectedURL)
  })

  it('should get the right URL for darwin platform', () => {
    const version = '3.6.1';
    setPlatform('darwin')
    let expectedURL = `https://github.com/mozilla/sops/releases/download/v${version}/sops-v${version}.darwin`

    let actualURL = sops.downloadURL(version)

    expect(actualURL).toEqual(expectedURL)
  })
})

describe('When SOPS is being downloaded', ()=> {
  it('should download the tool if it is not cached in the runner', async ()=>{
    const version = '3.6.1';
    mockCacheFile.mockResolvedValue('binarypath')
    mockFindTool.mockReturnValue('')

    await sops.download(version, 'someextension', 'someurl')

    expect(mockDownloadTool).toHaveBeenCalledWith('someurl');
  })

  it('should not download the tool if it is cached in the runner', async ()=>{
    const version = '3.6.1';
    mockCacheFile.mockResolvedValue('binarypath')
    mockFindTool.mockReturnValue('binarypath')

    await sops.download(version, 'someextension', 'someurl')

    expect(mockDownloadTool).not.toHaveBeenCalled();
  })
})

describe('When SOPS is being installed', ()=> {
  it('should add execute premissions to the installed binary', async ()=>{
    const version = '3.6.1';
    mockCacheFile.mockResolvedValue('binarypath/version')

    await sops.install(version, mockExecutePermission)

    expect(mockExecutePermission).toHaveBeenCalledWith('binarypath/version/sops', '777');
  })

  it('should add the path of SOPS to PATH variable', async ()=>{
    const version = '3.6.1';
    mockCacheFile.mockResolvedValue('binarypath/version')

    await sops.install(version, mockExecutePermission)

    expect(mockAddPath).toHaveBeenCalledWith('binarypath/version');
  })
})

describe('When execution of sops command',()=>{
  let secretFile = 'folder1/encrypted_file.yaml'
  describe('is successful', ()=>{
    beforeEach(()=>{
      mockExec.mockReturnValue({
        status: true,
        output: 'decrypted',
        error: ''
      } as command.Result)
    })

    it('should pass the right arguments', async ()=>{
      let expectedArgs: string[] = [];
      expectedArgs.push('--decrypt')
      expectedArgs.push('--output-type', 'json')
      expectedArgs.push(secretFile)

      await sops.decrypt('sops', secretFile)

      expect(mockExec).toHaveBeenCalledWith('sops', expectedArgs)
    })

    it('should not throw an error', async ()=>{
      await expect(sops.decrypt('sops', secretFile)).resolves.not.toThrow();
    })
  })

  describe('is a failure', ()=>{
    beforeEach(()=>{
      mockExec.mockReturnValue({
        status: false,
        output: '',
        error: 'Error message from SOPS'
      } as command.Result)
    })

    it('should throw an error', async ()=>{
      await expect(sops.decrypt('sops',secretFile)).rejects.toThrow();
    })

    it('should throw the error returned by the command', async ()=>{
      let expectedErrorMsg = 'Execution of sops command failed: Error message from SOPS'
      await expect(sops.decrypt('sops',secretFile)).rejects.toThrowError(expectedErrorMsg);
    })
  })
})

function setPlatform(platform:string) {
  Object.defineProperty(process, 'platform', {
    value: platform
  });
}