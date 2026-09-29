const _initPrint = async () =>{
    let workbook = await _scvExcelJS.loadWorkbookFromUrl(printDataSource.urlTmpl);

    saveAs(new Blob([await workbook.xlsx.writeBuffer()]), "Template import WBS.xlsx");
}

_initPrint();