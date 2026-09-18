define(['N/render', 'N/file', 'N/query', 'N/encode'],
    (render, file, query, encode) => {

        const getContentsFile = (_fileId) => {
            return file.load({ id: _fileId }).getContents();
        }

        const getUrlFile = (_fileId) => {
            return file.load({ id: _fileId }).url;
        }

        const formatNumber = (_num, _fixed) => {
            if (typeof _num === 'number' && _fixed) {
                _num = _num.toFixed(_fixed);
            }

            let parts = _num.toString().split(".");
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return parts.join(".");
        }

        const formatNumberWithObject = (_inputObj) => {
            Object.keys(_inputObj).forEach(ele => {
                if (!!_inputObj[ele] && !isNaN(_inputObj[ele])) {
                    _inputObj[ele] = formatNumber(_inputObj[ele]);
                }
            });

            return _inputObj;
        }

        const renderTemplateWithXml = (printfile) => {
            try {
                let xmlPdfPath = `../xml/pdf/${printfile}.xml`;
                let xmlString = getContentsFile(xmlPdfPath);
                let tmplRender = render.create();

                let objResFonts = getFonts();

                tmplRender.addCustomDataSource({
                    format: render.DataSource.OBJECT,
                    alias: "libPdf",
                    data: {
                        font: {
                            times: objResFonts.times_src,
                            times_bold: objResFonts.times_bold,
                            times_italic: objResFonts.times_italic,
                            times_bolditalic: objResFonts.times_italic_bold,

                            arial: objResFonts.arial_src,
                            arial_bold: objResFonts.arial_bold,
                            arial_italic: objResFonts.arial_italic,
                            arial_bolditalic: objResFonts.arial_italic_bold,
                        },
                        css: getContentsFile('../css/scv_pdf_print.css'),
                        rowcol100: getRowWithNumColumn(100),
                    }
                });

                tmplRender.templateContent = xmlString;

                return tmplRender;
            } catch (err) {
                throw err.message;
            }
        }

        const createImageBySubsidiary = (logoId, _height, _width) => {
            let tagImg = generateTagImageHtml(logoId, _height, _width);
            return tagImg;
        }

        const generateTagImageHtml = (_logoId, _orgWidth, _orgHeight, _expectedWidth) => {
            let srcLogo = getUrlFile(_logoId);
            let image = `<img src="${unReTextXML(srcLogo)}" alt="view" style="width: ${_orgWidth}px; height: ${_orgHeight}px;" />`;
            return image;
        }

        const unReTextXML = (text) => {
            let cus_name = text;
            if (!!text && typeof text === "string") {
                cus_name = cus_name.replace(/&/gi, '&amp;');
                cus_name = cus_name.replace(/>/gi, "&gt;");
                cus_name = cus_name.replace(/</gi, "&lt;");
                cus_name = cus_name.replace(/'/g, "&apos;");
                cus_name = cus_name.replace(/"/g, "&quot;");
            }
            return cus_name;
        }

        const formatDataXML = (str) => {
            if (str === 0) return str;
            if (!str || ['null', 'undefined'].includes(str)) return '';
            return typeof str === 'string' ? str.replace(/&/g, '&amp;') : str;
        }

        const formatDataXMLWithObject = (obj) => {
            Object.keys(obj).forEach(key => {
                obj[key] = formatDataXML(obj[key]);
            });
            return obj;
        }

        const getFonts = (_folderName = '') => {
            let arrResFonts = query.runSuiteQL({
                query: `SELECT DISTINCT a.name, a.url, a.filetype, b.name as folder_name
                FROM file a,
                    (
                        SELECT id, name, appfolder
                        FROM MediaItemFolder
                        START WITH (
                            appfolder LIKE 'SuiteScripts%' AND appfolder LIKE '%font${!!_folderName ? ' : ' + _folderName : ''}%'
                        )
                        CONNECT BY PRIOR id = parent
                    ) b
                WHERE a.folder = b.id
                    AND a.isinactive = 'F'
            `}).asMappedResults();

            let objResFonts = Object.fromEntries(
                arrResFonts.map(e => {
                    return [e.name.split('.')[0], e.url];
                })
            );

            return objResFonts;
        }

        const removeVietnameseTones = (str) => {
            return str
                .normalize("NFD") // tách ký tự và dấu
                .replace(/[\u0300-\u036f]/g, "") // xóa dấu
                .replace(/đ/g, "d")
                .replace(/Đ/g, "D")
                .trim();
        }

        const getRowWithNumColumn = (_numCol) => {
            let width_percent = 100 / _numCol;
            let contents = "<tr height='0%' style='display: none;'>";
            for (let i = 0; i < _numCol; i++) {
                contents += "<td width='" + width_percent + "%'></td>"
            }
            contents += "</tr>";

            return contents;
        }

        const createImageBySubsidiaryV2 = (subsidiaryRec, expectedWidth) => {
            let logoId = subsidiaryRec.getValue('logo') || subsidiaryRec.getValue("pagelogo");
            if (!logoId) return '';

            let imgFile = file.load({ id: logoId });
            let { width, height } = getPngWH(imgFile) || { width: 100, height: 100 };
            let logoUrl = imgFile.url;
            let expectedHeight = height;

            if (expectedWidth) {
                let ratio = roundNumber(width / height);
                expectedHeight = roundNumber(expectedWidth / ratio);
            } else expectedWidth = width;

            let tagImg = `<img src="${unReTextXML(logoUrl)}" alt="view" style="width: ${expectedWidth}px; height: ${expectedHeight}px;" />`;

            return tagImg;
        };

        const u32BE = (b, o) => (((((b[o] * 256) + b[o + 1]) * 256) + b[o + 2]) * 256) + b[o + 3];

        const hexToBytes = (hex) => {
            const n = hex.length;
            const out = new Array(n >>> 1);
            for (let i = 0, j = 0; i < n; i += 2) out[j++] = parseInt(hex.substr(i, 2), 16);
            return out;
        };

        const getPngWH = (f) => {
            const hex = encode.convert({
                string: f.getContents(),
                inputEncoding: encode.Encoding.BASE_64,
                outputEncoding: encode.Encoding.HEX
            });
            const bytes = hexToBytes(hex);
            const sig = [137, 80, 78, 71, 13, 10, 26, 10];
            if (bytes.length > 24 && sig.every((v, i) => bytes[i] === v)) {
                return { width: u32BE(bytes, 16), height: u32BE(bytes, 20) };
            }
        };

        const roundNumber = (_number, _precision = 2) => {
            let precision = Math.pow(10, _precision);
            return Math.round(_number * precision) / precision;
        }

        const getWHJPG = (f) => {
            const hex = encode.convert({string: f.getContents(), inputEncoding: encode.Encoding.BASE_64, outputEncoding: encode.Encoding.HEX});
            const bytes = hexToBytes(hex);
            if (bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) return null;
            let i = 2;
            while (i < bytes.length - 9) {
                if (bytes[i] !== 0xFF) { i++; continue; }
                while (bytes[i] === 0xFF) i++;
                const marker = bytes[i];
                if (marker === 0xD9 || marker === 0xDA) break;
                if ([0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF].includes(marker)) {
                    return {width: (bytes[i + 6] << 8) | bytes[i + 7], height: (bytes[i + 4] << 8) | bytes[i + 5]};
                }
                if (marker >= 0xD0 && marker <= 0xD7 || marker === 0x01) { i++; continue; }
                const length = (bytes[i + 1] << 8) | bytes[i + 2];
                if (length < 2) break;
                i += length + 1;
            }
            return null;
        };

        const createImageBySubsidiaryV3 = (subsidiaryRec, expectedWidth) => {
            let logoId = subsidiaryRec.getValue('logo') || subsidiaryRec.getValue('pagelogo');
            if (!logoId) return '';
            let imgFile = file.load({id: logoId});
            let type = String(imgFile.fileType || '').toUpperCase();
            let imageWH = null;
            if (type.includes('JPG') || type.includes('JPEG')) imageWH = getWHJPG(imgFile);
            else if (type.includes('PNG')) imageWH = getPngWH(imgFile);
            if (!imageWH) return '';
            let width = imageWH.width;
            let height = imageWH.height;
            if (expectedWidth) {
                width = expectedWidth;
                height = Math.round(expectedWidth * imageWH.height / imageWH.width);
            }
            return `<img src="${unReTextXML(imgFile.url)}" alt="view" width="${width}" height="${height}" />`;
        };
        return {
            formatNumber,
            formatNumberWithObject,
            renderTemplateWithXml,
            createImageBySubsidiary,
            createImageBySubsidiaryV2,
            formatDataXMLWithObject,
            formatDataXML,
            removeVietnameseTones,
            createImageBySubsidiaryV3
        };

    });
