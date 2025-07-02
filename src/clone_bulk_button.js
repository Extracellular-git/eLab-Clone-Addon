/*
@rootVar: EC_CLONE_BULK_BUTTON
@name: Clone Bulk Button add-on
@version: 1.0.0 
@description: Extracellular Clone Bulk Button add-on for eLab
@requiredElabVersion: 2.35.0
@author: Extracellular
*/

/*!
 * © 2025 Extracellular — released under the MIT License
 * See LICENSE file for details.
 */

var EC_CLONE_BULK_BUTTON = {};

function make_clone_name(orig, existingChildren) {
  // Filter children to only include direct clones (names that start with the original name + dash)
  const clonePattern = new RegExp(`^${orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)(?:-.*)?$`);
  const cloneNumbers = existingChildren
    .filter(child => !child.archived && clonePattern.test(child.name))
    .map(child => {
      const match = child.name.match(clonePattern);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(num => num > 0);
  
  // Find the highest number and increment
  const maxNumber = cloneNumbers.length > 0 ? Math.max(...cloneNumbers) : 0;
  return `${orig}-${maxNumber + 1}`;
}

(function (context) {
  context.init = function (data) {

    let clone_samples = function() {
      const samples = eLabSDK2.Inventory.Sample.SampleList.getSelectedSamples()
      // save the original names and sample IDs of the samples you want to clone, these will be the parent IDS
      const original_names = {};
      samples.forEach(sample => original_names[sample.sampleID] = sample.name);

      // Track completion of all cloning operations
      let completed = 0;
      let errors = 0;
      const total = samples.length;

      const checkCompletion = (hasError = false) => {
        completed++;
        if (hasError) {
          errors++;
        }
        
        if (completed === total) {
          if (errors === 0) {
            setTimeout(() => {
              console.log('All cloning operations completed successfully, refreshing page...');
              eLabSDK2.UI.Toast.showToast('All samples cloned successfully! Refreshing page...');
              window.location.reload();
            }, 1500);
          } else {
            console.log(`Cloning completed with ${errors} error(s). Page will not refresh to allow error review.`);
            eLabSDK2.UI.Toast.showToast(`Cloning completed with ${errors} error(s). Please review the console for details.`);
          }
        }
      };

      samples.forEach(sample => {
        // First, get existing children to determine the next clone number
        eLabSDK.API.call({
          method: 'GET',
          path: 'samples/{sampleID}/children',
          pathParams: {sampleID: sample.sampleID},
          onSuccess: (pre_child_xhr, pre_child_status, pre_child_response) => {
            const existingChildren = pre_child_response.data || [];
            
            // Now clone the sample
            eLabSDK.API.call({
              method: 'POST',
              path: 'samples/{sampleID}/clone',
              pathParams: {sampleID: sample.sampleID},
              body: {cloneTimes: 1, trackParent: true, ignoreAutoNumbering: true},
              onSuccess: () => {
                console.log(`Sample ${sample.name} with ID ${sample.sampleID} cloned successfully.`);

                // Fetch the updated children list to find the new clone
                eLabSDK.API.call({
                  method: 'GET',
                  path: 'samples/{sampleID}/children',
                  pathParams: {sampleID: sample.sampleID},
                  onSuccess: (child_xhr, child_status, child_response) => {
                    const list = child_response.data || child_response;
                    const unarchived = list.filter(child => !child.archived);
                    const clone = unarchived[unarchived.length - 1] // Find the newest un-archived child
                    if (!clone) {
                      console.warn(`No active clone found for sample ${sample.name} with ID ${sample.sampleID}`);
                      checkCompletion(true);
                      return;
                    }

                    // Generate the new name based on original name and existing children
                    const new_name = make_clone_name(original_names[sample.sampleID], existingChildren);
                    console.log(`Renaming cloned sample ${clone.name} with ID ${clone.sampleID} to ${new_name}`);
                    eLabSDK.API.call({
                      method: 'PATCH',
                      path: 'samples/{sampleID}',
                      pathParams: {sampleID: clone.sampleID},
                      body: {
                        name: new_name,
                        quantitySettings: {
                          unit: context.settings?.unit || 'Unit',
                          displayUnit: context.settings?.displayUnit || 'Unit'
                        }
                      },
                      onSuccess: (rename_xhr, rename_status, rename_response) => {
                        console.log(`Renamed cloned sample ${clone.sampleID} to ${new_name}`);
                        checkCompletion();
                      },
                      onError: (rename_xhr, rename_status, rename_error) => {
                        eLabSDK2.UI.Toast.showToast(`Error renaming cloned sample ${clone.sampleID}`);
                        console.error(`Error renaming cloned sample ${clone.sampleID}:`, rename_error);
                        console.error('Response:', rename_xhr);
                        console.error('Status:', rename_status);
                        checkCompletion(true);
                      }
                    });
                  },
                  onError: (child_xhr, child_status, child_error) => {
                    eLabSDK2.UI.Toast.showToast(`Error fetching children for sample ${sample.sampleID}`);
                    console.error(`Error fetching children for sample ${sample.name} with ID ${sample.sampleID}:`, child_error);
                    console.error('Response:', child_xhr);
                    console.error('Status:', child_status);
                    checkCompletion(true);
                  }
                });
              },
              onError: (xhr, status, error) => {
                eLabSDK2.UI.Toast.showToast(`Error cloning sample ${sample.sampleID}`);
                console.error(`Error cloning sample ${sample.name} with ID ${sample.sampleID}:`, error);
                console.error('Response:', xhr);
                console.error('Status:', status);
                checkCompletion(true);
              }
            });
          },
          onError: (pre_child_xhr, pre_child_status, pre_child_error) => {
            eLabSDK2.UI.Toast.showToast(`Error fetching existing children for sample ${sample.sampleID}`);
            console.error(`Error fetching existing children for sample ${sample.name} with ID ${sample.sampleID}:`, pre_child_error);
            console.error('Response:', pre_child_xhr);
            console.error('Status:', pre_child_status);
            checkCompletion(true);
          }
        });
      });

      eLabSDK2.UI.Toast.showToast(`Starting clone process for ${total} sample(s)...`);
    }

    let bulkActionButton = {
        id: 'bulkActionButton',
      title: 'Clone selected samples',
      label: 'Clone',
      icon: 'fas fa-clone', // font awesome icon, Optional
      onClick: () => {
          clone_samples()
      },
      isVisible: () => { // Optional, will be displayed by default if not provided.
          return true
      }
    }
    
    eLabSDK2.Inventory.Sample.SampleList.registerAction(bulkActionButton)
  };

})(EC_CLONE_BULK_BUTTON)

