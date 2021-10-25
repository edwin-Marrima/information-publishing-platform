const FileService = require('../src/file/FileService');
const fs = require('fs');
const path = require('path');
const config = require('config'); 
const { uploadDir, profileDir } = config;

 describe('createFolders',()=>{
     it('creadtes upload folder',async()=>{
        FileService.createFolders();
        expect(fs.existsSync(uploadDir)).toBe(true);
     });
     it('creates profiles folder under upoad folder',()=>{
        FileService.createFolders();
        const profileFolder = path.join('.',uploadDir,profileDir);
        expect(fs.existsSync(profileFolder)).toBe(true);
     });
 })