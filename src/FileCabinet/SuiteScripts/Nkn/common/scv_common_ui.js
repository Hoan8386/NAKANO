/**
 * @NApiVersion 2.1
 */
define([],

    () => {

        // add icon cho các nút có format là ['custpage_scv_btn']_[fileType] trong đó filetype được định nghĩa bên dưới
        const addIconToButton = (form) => {
            form.addField({
                id: 'custpage_scv_field_add_icons_to_buttons',
                type: 'INLINEHTML',
                label: 'Add icons to buttons'
            }).defaultValue = `<script>
                        const urlPdfIcon = "https://img.icons8.com/office/24/pdf.png";
                        const urlExcelIcon = "https://img.icons8.com/color/24/microsoft-excel-2019--v1.png";
                        const urlWordIcon = 'https://img.icons8.com/color/24/microsoft-word-2019--v2.png';

                        const PRINT_TYPE={
                           "pdf": urlPdfIcon,
                           "excel": urlExcelIcon,
                           "word": urlWordIcon,
                        }
                        const addIconToButtonVer2 = () => {
                            document.querySelectorAll('[id^=custpage_scv]').forEach((button) => {
                                addIconToButton(button.id);
                            });
                            document.querySelectorAll('[id^=secondarycustpage_scv]').forEach((button) => {
                                addIconToButton(button.id);
                            });
                        }

                        const addIconToButton = (buttonId) => {
                           Object.keys(PRINT_TYPE).forEach((printType) => {
                                let iconUrl;
                           if (buttonId.includes(printType.toLowerCase())) {
                               iconUrl = PRINT_TYPE[printType];
                               const buttonElement = document.getElementById(buttonId);// Get the button by ID
                            if (buttonElement) {
                                //Set the button's style for Excel icon
                                buttonElement.style.setProperty('padding-left', '24px', 'important'); // Add padding
                                buttonElement.style.setProperty('background-image', \`url('\${iconUrl}')\`, 'important'); // Set background image
                                buttonElement.style.setProperty('background-repeat', 'no-repeat', 'important'); // Prevent background repeat
                            }
                            }
                           });
                          }
                        
                        addIconToButtonVer2();
                 
                    </script>`;
        }

        const addExcelJs = (form) => {
            form.addField({
                id: 'custpage_scv_field_add_excel_js',
                type: 'INLINEHTML',
                label: 'Add excelJs'
            }).defaultValue =`
            <script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/1.3.8/FileSaver.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"></script>
            <script src="https://unpkg.com/pizzip@3.1.7/dist/pizzip.js"></script> <!--pizzip.js-->
            <script src="https://unpkg.com/pizzip@3.1.7/dist/pizzip-utils.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/docxtemplater/3.55.8/docxtemplater.js"></script>
            `
        }

        return {
            addIconToButton ,
            addExcelJs
        }

    });
