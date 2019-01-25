/*
 *  (c) 2019 Adobe. All rights reserved.
 *  This file is licensed to you under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License. You may obtain a copy
 *  of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software distributed under
 *  the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 *  OF ANY KIND, either express or implied. See the License for the specific language
 *  governing permissions and limitations under the License.
 */
$(document).ready(function () {
    'use strict';

    var REMOTE_COMPONENT_CONVERSION_SERVICE_PATH = "/libs/cq/modernize/component";

    var ui = $(window).adaptTo("foundation-ui");

    var componentRows;
    var convertedRows = [];
    var structureConverterContainer = document.querySelector(".js-aem-StructureConverter-container");
    var searchPathField = document.querySelector(".js-aem-StructureConverter-searchPath");
    var infoText = document.querySelector(".js-aem-StructureConverter-infoText");
    var showPagesButton = document.querySelector(".js-aem-StructureConverter-showComponents");
    var backButton = document.querySelector(".js-aem-StructureConverter-back");
    var convertPagesButton = document.querySelector(".js-aem-StructureConverter-convertComponents");
    var pageSearch = document.querySelector(".js-aem-StructureConverter-componentSearch");
    var convertedPages = document.querySelector(".js-aem-StructureConverter-convertedComponents");
    var pageTable = document.querySelector(".js-aem-StructureConverter-components");

    function updateRepositoryPathParameter () {
        if (!searchPathField) {
            return;
        }

        var path = searchPathField.value;
        // Set the path query parameter
        window.location = window.location.pathname + "?path=" + path;
    }

    function adjustConvertButton (selectionCount) {
        // adjust button label
        convertPagesButton.textContent = Granite.I18n.get("Convert {0} pages(s)", selectionCount, "Number of pages to be converted");
    }

    function init () {
        componentRows = pageTable.items.getAll();

        for (var i = 0, length = componentRows.length; i < length; i++) {
            var row = componentRows[i];

            if (row.hasAttribute("data-modernize-structure-converted")) {
                convertedRows.push(row);
            }
        }

        if (infoText) {
          infoText.textContent = "";

          if (componentRows && componentRows.length > 0) {
            if (componentRows.length === 1 && !componentRows[0].dataset["foundationCollectionItemId"]) {
              // The empty row, hide the infoText
              infoText.setAttribute("hidden", true);
            } else {
              infoText.textContent = Granite.I18n.get("Found {0} pages(s)", componentRows.length);
            }
          }
        }

        showPagesButton.on("click", updateRepositoryPathParameter);
        backButton.on("click", updateRepositoryPathParameter);

        pageTable.on("coral-table:change", function (event) {
            var selection = event && event.detail && event.detail.selection ? event.detail.selection : [];
            var count = selection.length;

            // Deselect already converted components
            for (var i = 0; i < selection.length; i++) {
                var row = selection[i];
                if (row.hasAttribute("data-modernize-structure-converted")) {
                    // Don't trigger too many events
                    row.set('selected', false, true);
                    count--;
                }
            }

            adjustConvertButton(count);
        });

        convertPagesButton.on("click", function () {
            // get paths from table
            var paths = [];

            var selectedComponentRows = pageTable.selectedItems;
            for (var i = 0, length = selectedComponentRows.length; i < length; i++) {
                var value = selectedComponentRows[i].dataset["foundationCollectionItemId"];

                if (value) {
                    paths.push(value);
                }
            }

            var url = REMOTE_COMPONENT_CONVERSION_SERVICE_PATH + "/content/convert.json";
            var data = {
                paths : paths
            };

            // show overlay and wait
            ui.wait();

            $.post(url, data, function (data) {
                convertPagesButton.hidden = true;
                backButton.hidden = false;
                pageSearch.hidden = true;
                convertedPages.hidden = false;

                // build result table
                var count = 0;
                var successCount = 0;
                var errorCount = 0;

                if (Object.keys(data).length) {
                    convertedPages.items.clear();
                }

                for (var path in data) {
                    count++;

                    // Create a row for the results table
                    var row = new Coral.Table.Row();
                    convertedPages.items.add(row);

                    // Create a cell that will contain the path to the component
                    var pathCell = new Coral.Table.Cell();
                    pathCell.textContent = path;

                    row.appendChild(pathCell);

                    var links = "-";
                    var message = Granite.I18n.get("Successfully converted page");
                    var resultPath = data[path].resultPath;

                    if (resultPath) {
                        // success
                        successCount++;

                        var href = Granite.HTTP.externalize(resultPath) + ".html";
                        var crxHref = Granite.HTTP.externalize("/crx/de/index.jsp#" + resultPath.replace(":", "%3A"));
                        links = '<a href="' + href + '" target="_blank" class="coral-Link">show</a> / <a href="' + crxHref + '" target="_blank" class="coral-Link">crxde</a>';
                    } else {
                        // error
                        errorCount++;
                        message = Granite.I18n.get("Error");

                        if (data[path].errorMessage) {
                            message += ": " + data[path].errorMessage;
                        }
                    }

                    // Create the cell that contains the links
                    var linksCell = new Coral.Table.Cell();
                    row.appendChild(linksCell);
                    linksCell.innerHTML = links;

                    // Add the cell that contains the message
                    var messageCell = new Coral.Table.Cell();
                    messageCell.textContent = message;
                    row.appendChild(messageCell);
                }

                var type = "success";
                var successes = Granite.I18n.get("Converted <strong>{0}</strong> component(s)", successCount, "");
                var errors = Granite.I18n.get("Failed converting <strong>{0}</strong> component(s)", errorCount, "");
                var content = successes;

                if (errorCount > 0 && successCount > 0) {
                    // mixed (errors and successes)
                    type = "warning";
                    content = errors + " : " + successes;
                } else if (errorCount > 0) {
                    // error
                    type = "error";
                    content = errors;
                }

                ui.notify(undefined, content, type);

            }).fail(function () {
                var title = Granite.I18n.get("Error");
                var message = Granite.I18n.get("Call to structure conversion servlet failed. Please view the logs.");
                ui.alert(title, message, "error");
            }).always(function () {
                ui.clearWait();
            });
        });
    }

    Coral.commons.ready(structureConverterContainer, init);
});
