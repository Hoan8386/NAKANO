const _initPrint = async () =>{
        console.log("[Working Budget] data:", printDataSource.data);

        let workbook = await _scvExcelJS.loadWorkbookFromUrl(printDataSource.urlTmpl);

        let curSheet = workbook.worksheets[0];
        let data = printDataSource.data;

        _scvExcelJS.replaceKeyCellValue(curSheet, 'A1', '{pImage}', '');
        if (data.image) {
            let imageId = workbook.addImage({
                base64: data.image.base64,
                extension: data.image.extension
            });

            curSheet.addImage(imageId, {
                tl: {col: 0, row: 0},
                br: {col: 1, row: 1}
            });
            // curSheet.addImage(imageId, {
            //     tl: {col: 0, row: 0},
            //     ext: {
            //         width: data.image.width,
            //         height: data.image.height
            //     }
            // });
        }
        _scvExcelJS.replaceKeyCellValue(curSheet, 'D3', '{pProjectNo}', data.projectNo);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'N3', '{pPrimaryCurrency}', data.primaryCurrency);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'P3', '{pContractSum}', data.contractSum);

        _scvExcelJS.replaceKeyCellValue(curSheet, 'D5', '{pProjectName}', data.projectName);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'N5', '{pPrimaryCurrency}', data.primaryCurrency);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'P5', '{pConstructionNetCost}', data.constructionNetCost);

        _scvExcelJS.replaceKeyCellValue(curSheet, 'N7', '{pPrimaryCurrency}', data.primaryCurrency);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'P7', '{pTotalProfit}', data.totalProfit);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'R7', '{pTotalProfitPer}', data.totalProfitPer);

        _scvExcelJS.replaceKeyCellValue(curSheet, 'N8', '{pPrimaryCurrency}', data.primaryCurrency);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'P8', '{pOverhead}', data.overhead);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'R8', '{pOverheadPer}', data.overheadPer);

        _scvExcelJS.replaceKeyCellValue(curSheet, 'N9', '{pPrimaryCurrency}', data.primaryCurrency);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'P9', '{pProfitAttendance}', data.profitAttendance);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'R9', '{pProfitAttendancePer}', data.profitAttendancePer);

        _scvExcelJS.replaceKeyCellValue(curSheet, 'D10', '{pSiteLocation}', data.siteLocation);

        _scvExcelJS.replaceKeyCellValue(curSheet, 'N12', '{pPrimaryCurrency}', data.primaryCurrency);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'P12', '{pAwardProfit}', data.awardProfit);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'R12', '{pAwardProfitPer}', data.awardProfitPer);

        _scvExcelJS.replaceKeyCellValue(curSheet, 'N13', '{pPrimaryCurrency}', data.primaryCurrency);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'P13', '{pPcSumProvSum}', data.pcSumProvSum);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'R13', '{pPcSumProvSumPer}', data.pcSumProvSumPer);

        _scvExcelJS.replaceKeyCellValue(curSheet, 'D15', '{pClient}', data.client);

        _scvExcelJS.replaceKeyCellValue(curSheet, 'D17', '{pConsultantArchitects}', data.consultantArchitects);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'N17', '{pPrimaryCurrency}', data.primaryCurrency);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'P17', '{pContractSumByGFA}', data.contractSumByGFA === 'Infinity' ? '' : data.contractSumByGFA);

        _scvExcelJS.replaceKeyCellValue(curSheet, 'N18', '{pPrimaryCurrency}', data.primaryCurrency);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'P18', '{pContractSumByCFA}', data.contractSumByCFA === 'Infinity' ? '' : data.contractSumByCFA);

        _scvExcelJS.replaceKeyCellValue(curSheet, 'D19', '{pConsultantStructure}', data.consultantStructure);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'P20', '{pNetCostByCFA}', data.netCostByCFA === 'Infinity' ? '' : data.netCostByCFA);

        _scvExcelJS.replaceKeyCellValue(curSheet, 'D21', '{pConsultantME}', data.consultantME);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'D23', '{pConsultantLandscape}', data.consultantLandscape);

        _scvExcelJS.replaceKeyCellValue(curSheet, 'P23', '{pProjectGeneralManager}', data.projectGeneralManager);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'P24', '{pProjectManager}', data.projectManager);

        _scvExcelJS.replaceKeyCellValue(curSheet, 'D25', '{pConsultantID}', data.consultantID);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'P25', '{pAssistProjectManager}', data.assistProjectManager);

        _scvExcelJS.replaceKeyCellValue(curSheet, 'D27', '{pConsultantQS}', data.consultantQS);

        _scvExcelJS.replaceKeyCellValue(curSheet, 'N28', '{pPrimaryCurrency}', data.primaryCurrency);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'P28', '{pIndirectExpenses}', data.indirectExpenses);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'R28', '{pIndirectExpensesPer}', data.indirectExpensesPer);

        _scvExcelJS.replaceKeyCellValue(
            curSheet,
            'D29',
            ['{pConstructionPeriodStart}', '{pConstructionPeriodEnd}', '{pConstructionPeriodMonths}'],
            [data.constructionPeriodStart, data.constructionPeriodEnd, data.constructionPeriodMonths]
        );

        _scvExcelJS.replaceKeyCellValue(curSheet, 'D30', '{pDefectsLiabilityPeriod}', data.defectsLiabilityPeriod);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'D31', '{pTypeOfContract}', data.typeOfContract);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'D32', '{pModeOfPayment}', data.modeOfPayment);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'D33', '{pRetention}', data.retention);

        _scvExcelJS.replaceKeyCellValue(curSheet, 'D36', '{pTypeOfBuilding}', data.typeOfBuilding);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'D37', '{pStructure}', data.structure);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'D38', '{pBasementCarparkArea}', data.basementCarparkArea);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'D39', '{pGfa}', data.gfa);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'D40', '{pCfa}', data.cfa);

        _scvExcelJS.replaceKeyCellValue(curSheet, 'B43', '{pPiling}', data.piling);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'G43', '{pWireMesh}', data.wireMesh);

        _scvExcelJS.replaceKeyCellValue(curSheet, 'B44', '{pConcrete}', data.concrete);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'G44', '{pFormworks}', data.formworks);

        _scvExcelJS.replaceKeyCellValue(curSheet, 'B45', '{pRebar}', data.rebar);
        _scvExcelJS.replaceKeyCellValue(curSheet, 'G45', '{pSteelStructure}', data.steelStructure);
        _scvExcelJS.saveWorkbook(workbook, "Working Budget.xlsx");

        
        setTimeout(() => window.close(), 1000);
}

_initPrint();