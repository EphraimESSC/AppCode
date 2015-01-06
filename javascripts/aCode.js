var a = angular.module('myapp', []);

a.directive("enhanceUi", function () {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      var params = scope.$eval(attrs.enhanceUi),
          event = params.event,
          condition = params.condition;
      FunctionalityModule.enhancePage();
      $(element.parent()).trigger( "updatelayout" ).listview('refresh');
    }
  }
});

a.factory('Data', function () {
  return {
    RadioGroupCount : 0,
    SliderCount: 0,
    SelectMenuCount: 0,
    TextLabel: "",
 //   SelectedCategoriesInfo : {},
    SelectedControls : {},
    ClassificationDataAdded: [],  // to monitor change in classification configuration
    sharedData : {
      controls: {},
      classificationData: []
    },
  }
});

a.run(function($rootScope, Data) {

});
a.controller('ClassificationListController', ['$scope', function ($scope) {

  $scope.data = {};

}]);


a.controller('ConfigureClassificationController', ['$scope', 'Data', function ($scope, Data) {
  $scope.sharedData = Data.sharedData;

  $scope.showRestartSection = false;

  DataModule.execute("classification", "selectData", [], function (results) {
    var rows = results.rows;
    if (rows === undefined) {
      return;
    }

    var classificationsMap = {};

    angular.forEach(rows, function (r, key) {
      // console.log(r);

      if (r.parentClassificationId === null) {
        if (classificationsMap[r.classificationId] == undefined) {
          var classData = {
            data: {
              classificationInsertId: r.classificationId,
              id: r.classificationId,
              name: r.classificationName,
              value: false
            },
            subCategoryInput: "",
            categorieschildren: []
          };

          classificationsMap[r.classificationId] = classData;
        }
      } else {
        if (classificationsMap[r.parentClassificationId] !== undefined) {
          classificationsMap[r.parentClassificationId].categorieschildren.push({
            data: {
              classificationInsertId: r.classificationId,
              id: "" + r.parentClassificationId + r.classificationId,
              name: r.classificationName,
              value: false
            },
            subCategoryInput: ""
          });
        }
      }
    });

    // console.log(classificationsMap);

    angular.forEach(classificationsMap, function (v, key) {
      Data.sharedData.classificationData.push(v);
    });

    $scope.$apply();
  });

  $scope.restartApplication = function () {
    $('[data-url]' ).remove();
    window.location.reload();
  }

  $scope.addClassification = function () {

    if ($scope.inputClassificationName === undefined || $scope.inputClassificationName === "") return;

    DataModule.execute("classification", "insertData", [$scope.inputClassificationName, null], function (result) {
      FunctionalityModule.addClassificationName(result.insertId, $scope.inputClassificationName);
      Data.sharedData.classificationData.push(
        {
          data: {
            id: result.insertId,
            name: $scope.inputClassificationName,
            value: false
          },
          name: "",
          categorieschildren: []
        }
      );
      $scope.inputClassificationName = "";
      $scope.$apply();

      FunctionalityModule.enhancePage();
      $('.js-classify-diagnose-button').removeClass('ui-disabled');
    });

    $scope.showRestartSection = true;
  };

  $scope.addSubClassification = function (classificationId, index) {
    var subClassificationName = Data.sharedData.classificationData[index].subCategoryInput;
    if (subClassificationName === undefined || subClassificationName === "") return;

    DataModule.execute("classification", "insertData",
                       [subClassificationName, classificationId], function (result) {

      var insertId = result.insertId;

      Data.sharedData.classificationData[index].categorieschildren.push(
        {
          data: {
            "name": subClassificationName,
            "id": insertId,
            value: false
          }
        }
      );
      Data.sharedData.classificationData[index].subCategoryInput = "";
      $scope.$apply();
    });

    $scope.showRestartSection = true;
  };

  $scope.deleteClassification = function (classificationId, index) {
    DataModule.execute('classification', 'deleteData', [classificationId], function () {
      Data.sharedData.classificationData.splice(index, 1);
      $scope.$apply();
    }, 'delete');

    $scope.showRestartSection = true;
  };

  $scope.deleteSubCategory = function (subCategoryInsertId, classificationId) {

    var classIndex = $scope.sharedData.classificationData.map(function(obj, i) {
      if(obj.id === classificationId) {
          return i;
      }
    }).filter(isFinite)[0];


    var subIndex = Data.sharedData.classificationData[classIndex].categorieschildren.map(function(obj, i) {
      if(obj.subCategoryInsertId === subCategoryInsertId) {
          return i;
      }
    }).filter(isFinite)[0];

    DataModule.execute('classification', 'deleteData', [subCategoryInsertId], function () {
      Data.sharedData.classificationData[classIndex].categorieschildren.splice(subIndex, 1);
      $scope.$apply();
    }, 'delete');

    $scope.showRestartSection = true;
  };

}]);


a.controller('DiagnoseController', ['$scope', '$compile', 'Data', function ($scope, $compile, Data) {

 // $scope.SelectedCategoriesInfo = Data.SelectedCategoriesInfo;
  $scope.SelectedControls = Data.SelectedControls;
  $scope.sharedData = Data.sharedData;
  $scope.ClassificationDataAdded = Data.ClassificationDataAdded;

  FunctionalityModule.setSharedData(Data.sharedData);

  DiagnoseTabFunctionality.setDataControls(Data);

  $scope.$watch('sharedData.controls', function (newVal, oldVal) {
    if (newVal === oldVal) return;
    var r = $compile('<r controls="sharedData.controls"></r>')($scope);
    var e = angular.element(document.getElementById('ControlsContainer'));
    e.append(r);
  });

  $scope.$watch('sharedData.classificationData', function (newValue, oldValue) {
    angular.forEach(Data.ClassificationDataAdded, function (v, i) {
      var copyClassificationData = angular.copy(Data.sharedData.classificationData);
      updateId(v.controlId, v.uniqueProperty, copyClassificationData);
      v.classification.categorieschildren = copyClassificationData;
    });

    setTimeout(function(){
                $('#defaultPage').enhanceWithin();
              }, 1);
  }, true);

  $scope.saveDiagnoseItemsData = function() {
    DiagnoseTabFunctionality.saveDiagnoseData(Data);
  };

}]);


function updateId(controlsId, uniqueProperty, copyClassificationData) {

  angular.forEach(copyClassificationData, function (v, i) {
    v.data.id = controlsId + uniqueProperty + v.data.id;
    v.data.diagnoseControlId = controlsId;
    if (v.categorieschildren) {
      updateId(controlsId, uniqueProperty, v.categorieschildren);
    }
  });
}

function updateParentInfo() {

}


function createDirective(name){
  return function($compile, $templateCache, Data){
    return {
      restrict: 'E',
      scope : {
        controls: "=",
        groupname: "=",
        parent: "=",
        uniqueProperty: "@"
      },
      compile: function(tElem, tAttrs){

        return {
          pre: function(scope, iElem, iAttrs){

            if (name === "r" && scope.uniqueProperty !== undefined) {
              Data.uniqueProperty = scope.uniqueProperty;
            }

            if (scope.controls === undefined || scope.controls.type === undefined) return;

            var template = $templateCache.get(scope.controls.type);

            if (scope.controls.type === "RadioGroup") {
              template = processRadioGroup(scope, Data, $templateCache, template);
            }

            if (scope.controls.type === "CheckboxGroup") {
              processCheckboxGroup(scope);
            }

            if (scope.controls.type === "RadioButton") {
              scope.controls.uniqueProperty = Data.uniqueProperty;
            }

            if (scope.controls.type === "Checkbox") {
              template = processCheckbox(scope, Data, $templateCache, template);
            }

            if (scope.controls.type === "TextInput") {
              template = processTextInput(scope, Data, $templateCache, template);
            }

            if (scope.controls.type === "Text") {
              Data.TextLabel = scope.controls.properties.text;
            }

            if (scope.controls.type === "ToggleSwitch") {
              template = processToggleSwitch(scope, Data, $templateCache, template);
            }

            if (scope.controls.type === "Slider") {
              template = processSlider(scope, Data, $templateCache, template, iElem);
            }

            if (scope.controls.type === "Grid") {
              processGrid(scope);
            }

            if (scope.controls.type === "SelectMenu") {
              template = processSelectMenu(scope, Data, $templateCache, template, iElem);
            }

            var newElement = angular.element(template);
            $compile(newElement)(scope);
            iElem.append(newElement);
          },
          post: function(scope, iElem, iAttrs){

            if (scope.controls.type === "Tabs") {
              setTimeout(function(){
                $('#defaultPage').enhanceWithin();
                $(iElem).tabs();
                $(iElem).data('tabsInitialized', true);
              }, 1);
            }

            if (scope.controls.type === "Slider") {
              scope.$on(
                        "$destroy",
                        function( event ) {
                            iElem.off( "change" );
                        }
                    );
            }
          }
        }
      }
    }
  }
}

a.directive('r', createDirective('r'));
a.directive('content', createDirective('content'));
a.directive('radiogroup', createDirective('radiogroup'));
a.directive('checkboxgroup', createDirective('checkboxgroup'));


a.directive('tabs', function ($compile, $templateCache) {
  var directive = {};

  directive.restrict = "E";

  directive.compile = function(tElement, tAttrs){
    return {
      pre: function(scope, element, iAttrs, $){

        var template = '';

        template = $templateCache.get("Tabs");

        var newElement = angular.element(template);
        $compile(newElement)(scope);
        element.append(newElement);
      },
      post: function(scope, element, iAttrs){

        setTimeout(function(){
          $('#defaultPage').enhanceWithin();
          $(element).tabs();
          $(element).data('tabsInitialized', true);
        }, 1);
      }
    }
  }

  directive.scope = {
    controls: "="
  }

  directive.controller = function() {
  }

  return directive;
});


a.directive('categories',
            ["$compile", "$templateCache", "Data",
             function ($compile, $templateCache, Data) {
  var directive = {};

  directive.restrict = "E";

  directive.scope = {
    categorieschildren: "=",
    parent: "="
  }

  directive.compile = function(tElem, tAttrs) {
    return {
      pre: function(scope, element, iAttrs, $) {

        var template = '', templateName = '';

        templateName = "CategoriesButtons";

        if (scope.categorieschildren !== undefined) {
          angular.forEach(scope.categorieschildren, function (v, i) {
            if (v.categorieschildren && v.categorieschildren.length > 0) {
              templateName = "CategoriesTabs";
              return;
            }
          });
        }

        if (scope.categorieschildren) {
          angular.forEach(scope.categorieschildren, function (v, i) {
            scope.$watch('categorieschildren[' + i + '].data', function (newVal, oldVal) {
              // console.log(newVal, oldVal);
              if (newVal.value === true || newVal.value === "true") {

                //console.log(newVal.diagnoseControlId);
                //console.log(Data.SelectedControls[newVal.diagnoseControlId]);

                if (Data.SelectedControls[newVal.diagnoseControlId].categoriesInfo === undefined) {
                  Data.SelectedControls[newVal.diagnoseControlId].categoriesInfo = {};
                }
                Data.SelectedControls[newVal.diagnoseControlId].categoriesInfo[newVal.id] = newVal;
              } else if (newVal.value === false && oldVal.value === true
                         || newVal.value === "false" && oldVal.value === "true") {

                if (Data.SelectedControls !== undefined
                    && Data.SelectedControls[newVal.diagnoseControlId] !== undefined
                    && Data.SelectedControls[newVal.diagnoseControlId].categoriesInfo !== undefined
                    && Data.SelectedControls[newVal.diagnoseControlId].categoriesInfo[newVal.id] !== undefined)
                {
                  Data.SelectedControls[newVal.diagnoseControlId].categoriesInfo[newVal.id] = undefined;
                  delete Data.SelectedControls[newVal.diagnoseControlId].categoriesInfo[newVal.id];
                }
              }
            }, true);
          });
        }

        template = $templateCache.get(templateName);

        var newElement = angular.element(template);
        $compile(newElement)(scope);
        element.append(newElement);

        //scope.$watch('categorieschildren', function (newValue, oldValue) {
        //  var newElement = angular.element(template);
         // console.log(element.find('tabs, .categories-tabs'));

          //var arr = element.find('tabs, .categories-tabs');
          //for (var i = 0; i < arr.length; i++) {

          /*jQuery(element.find('tabs, .categories-tabs')).each(function (i, v) {
            //var v = arr[i];

            if (v === undefined) return;

            var $v = jQuery(v);
            var init = $v.data('tabs-initialized');
            if (init === 'true') {
              $v.tabs('destroy');
              $v.data('tabs-initialized', 'false')
            }
          })*/

          //element.html('');
          //$compile(newElement)(scope);
          //element.append(newElement);
        ///  setTimeout(function(){
        //      jQuery('#defaultPage').enhanceWithin();
        //      jQuery(element).find('tabs, .categories-tabs').tabs();
        //    }, 1);

        //});

      },
      post: function(scope, element, iAttrs){

        setTimeout(function(){
          $('#defaultPage').enhanceWithin();
          $(element).find('.categories-tabs').tabs().data('tabs-initialized', 'true');
        }, 1);
      }
    }
  }

  directive.controller = function($scope) {
   // console.log($scope);
  }

  return directive;
}
]
);


function processRadioGroup(scope, Data, $templateCache, template) {

  Data.RadioGroupCount += 1;
  scope.controls.groupname = "RadioGroup" + Data.RadioGroupCount;
  scope.controls.name = scope.controls.properties.legend;

  if (scope.controls.properties.id === undefined) {
    scope.controls.properties.id = "RadioGroup" + Data.RadioGroupCount;
  }

  scope.$watch('controls', function (newVal, oldVal) {
    if (newVal.value !== undefined) {
      Data.SelectedControls[newVal.properties.id] = {
        label: newVal.properties.legend,
        type: newVal.type,
        valueLabel: newVal.value,
        value: newVal.value
      };
      scope.controls.showCategory = true;
    } else {
      Data.SelectedControls[newVal.properties.id] = undefined;
      delete Data.SelectedControls[newVal.properties.id];
      scope.controls.showCategory = false;
    }
  }, true);

  template += $templateCache.get('CategoriesRoot');

  var copyClassificationData = angular.copy(Data.sharedData.classificationData);
  updateId(scope.controls.properties.id, Data.uniqueProperty, copyClassificationData);

  Data.ClassificationDataAdded.push({
    controlId: scope.controls.properties.id,
    uniqueProperty: Data.uniqueProperty,
    classification: copyClassificationData
  });

  scope.controls.categorieschildren = copyClassificationData;

  return template;
}


function processCheckboxGroup(scope) {
  scope.controls.name = scope.controls.properties.legend;

  /** This needs to be changed*/
  angular.forEach(scope.controls.children, function (childControl, i) {
    childControl.name = scope.controls.name;
  });
}

function processCheckbox(scope, Data, $templateCache, template) {
  scope.controls.uniqueProperty = Data.uniqueProperty;
  scope.controls.properties.id = Data.uniqueProperty + scope.controls.properties.id;

  scope.$watch('controls', function (newVal, oldVal) {
    if (newVal.value === true) {
      Data.SelectedControls[newVal.properties.id] = {
        label: newVal.name,
        type: newVal.type,
        valueLabel: newVal.properties.label,
        value: newVal.value
      };
      scope.controls.showCategory = true;
    } else {
      if (Data.SelectedControls[newVal.properties.id] !== undefined) {
        Data.SelectedControls[newVal.properties.id] = undefined;
        delete Data.SelectedControls[newVal.properties.id];
      }
      scope.controls.showCategory = false;
    }
  }, true);

  template += $templateCache.get('CategoriesRoot');

  var copyClassificationData = angular.copy(Data.sharedData.classificationData);
  updateId(scope.controls.properties.id, Data.uniqueProperty, copyClassificationData);

  Data.ClassificationDataAdded.push({
    controlId: scope.controls.properties.id,
    uniqueProperty: Data.uniqueProperty,
    classification: copyClassificationData
  });

  scope.controls.categorieschildren = copyClassificationData;

  return template;
}

function processSlider(scope, Data, $templateCache, template, iElem) {
  scope.controls.value = 0;

  scope.controls.uniqueProperty = Data.uniqueProperty;
  scope.controls.properties.id = Data.uniqueProperty + scope.controls.properties.id;

  iElem.on('change', 'input[type="number"]', function () {
    scope.controls.value = parseInt($(this).val());
    scope.$apply();
  });

  scope.$watch('controls', function (newVal, oldVal) {
    if (newVal.value !== 0 && newVal.value !== oldVal.value) {
      Data.SelectedControls[newVal.properties.id] = {
        label: newVal.properties.label,
        type: newVal.type,
        valueLabel: newVal.value,
        value: newVal.value
      };
      scope.controls.showCategory = true;
    } else if (oldVal.value !== 0 && newVal.value === 0) {
      if (Data.SelectedControls[newVal.properties.id] !== undefined) {
        Data.SelectedControls[newVal.properties.id] = undefined;
        delete Data.SelectedControls[newVal.properties.id];
      }
      scope.controls.showCategory = false;
    }
  }, true);

  template += $templateCache.get('CategoriesRoot');

  var copyClassificationData = angular.copy(Data.sharedData.classificationData);
  updateId(scope.controls.properties.id, Data.uniqueProperty, copyClassificationData);

  Data.ClassificationDataAdded.push({
    controlId: scope.controls.properties.id,
    uniqueProperty: Data.uniqueProperty,
    classification: copyClassificationData
  });

  scope.controls.categorieschildren = copyClassificationData;

  return template;
}


function processTextInput(scope, Data, $templateCache, template) {

  scope.controls.uniqueProperty = Data.uniqueProperty;
  scope.controls.properties.id = Data.uniqueProperty + scope.controls.properties.id;

  scope.$watch('controls', function (newVal, oldVal) {
    // console.log(newVal, oldVal);
    if (newVal.value !== undefined && newVal.value !== "") {
      Data.SelectedControls[newVal.properties.id] = {
        label: newVal.properties.label,
        type: newVal.type,
        valueLabel: newVal.value,
        value: newVal.value
      };
      scope.controls.showCategory = true;
    } else {
      if (Data.SelectedControls[newVal.properties.id] !== undefined) {
        Data.SelectedControls[newVal.properties.id] = undefined;
        delete Data.SelectedControls[newVal.properties.id];
      }
      scope.controls.showCategory = false;
    }
  }, true);

  template += $templateCache.get('CategoriesRoot');

  var copyClassificationData = angular.copy(Data.sharedData.classificationData);
  updateId(scope.controls.properties.id, Data.uniqueProperty, copyClassificationData);

  Data.ClassificationDataAdded.push({
    controlId: scope.controls.properties.id,
    uniqueProperty: Data.uniqueProperty,
    classification: copyClassificationData
  });

  scope.controls.categorieschildren = copyClassificationData;

  return template;
}

function processToggleSwitch(scope, Data, $templateCache, template) {

  Data.SliderCount += 1;

  if (scope.controls.properties.id === undefined) {
    scope.controls.properties.id = "ToggleSwitch" + Data.SliderCount;
  }

  scope.controls.properties.label = Data.TextLabel;
  Data.TextLabel = "";

  scope.controls.uniqueProperty = Data.uniqueProperty;
  scope.controls.properties.id = Data.uniqueProperty + scope.controls.properties.id;

  scope.controls.value = "false";

  scope.$watch('controls', function (newVal, oldVal) {
    // console.log(newVal, oldVal);
    if (newVal.value === "true" && oldVal.value === "false") {
      Data.SelectedControls[newVal.properties.id] = {
        label: newVal.properties.label,
        type: newVal.type,
        valueLabel: newVal.properties.label1,
        value: newVal.value
      };
      scope.controls.showCategory = true;
    } else if (newVal.value === "false") {
      Data.SelectedControls[newVal.properties.id] = undefined;
      delete Data.SelectedControls[newVal.properties.id];
      scope.controls.showCategory = false;
    }
  }, true);

  template += $templateCache.get('CategoriesRoot');

  var copyClassificationData = angular.copy(Data.sharedData.classificationData);
  updateId(scope.controls.properties.id, Data.uniqueProperty, copyClassificationData);

  Data.ClassificationDataAdded.push({
    controlId: scope.controls.properties.id,
    uniqueProperty: Data.uniqueProperty,
    classification: copyClassificationData
  });

  scope.controls.categorieschildren = copyClassificationData;

  return template;
}

function processGrid(scope) {
  var control = scope.controls;

  var rows = control.properties && control.properties.rows ? control.properties.rows : 1;
  if (control.properties === undefined) {
    control.properties = {};
  }
  control.properties.uiClass = GridBuilder.getGridClass(control.children, rows);
  GridBuilder.setGridControlLabels(control);
}

function processSelectMenu(scope, Data, $templateCache, template, iElem) {

  Data.SelectMenuCount += 1;

  if (scope.controls.properties.id === undefined) {
    scope.controls.properties.id = "SelectMenu" + Data.SelectMenuCount;
  }

  if (scope.controls.properties.options.children) {
    scope.controls.previousValue = scope.controls.value =
      scope.controls.defaultValue = scope.controls.properties.options.children[0].value;
    scope.controls.previousValueLabel = scope.controls.valueLabel =
      scope.controls.defaultValueLabel = scope.controls.properties.options.children[0].text;
  }

  iElem.on('change', 'select.control', function (e) {
    //console.log('change');

    var value = $(this).val();
    var selectedValueLabel = $('option[value="' + value + '"]:selected', $(this)).text();

    if (value !== scope.controls.previousValue
        && value !== scope.controls.defaultValue
        || selectedValueLabel !== scope.controls.previousValueLabel
        && selectedValueLabel !== scope.controls.defaultValueLabel) {

      scope.controls.previousValue = scope.controls.value;
      scope.controls.previousValueLabel = scope.controls.valueLabel;

      scope.controls.value = value;
      scope.controls.valueLabel = selectedValueLabel;

      Data.SelectedControls[scope.controls.properties.id] = {
        label: scope.controls.properties.options.label,
        type: scope.controls.type,
        valueLabel: scope.controls.valueLabel,
        value: scope.controls.value
      };
      scope.controls.showCategory = true;
    } else {
      Data.SelectedControls[scope.controls.properties.id] = undefined;
      delete Data.SelectedControls[scope.controls.properties.id];
      scope.controls.showCategory = false;
    }
    scope.$apply();
  });

/*  scope.$watch('controls', function (newVal, oldVal) {
     console.log(newVal, oldVal);
  }, true); */

  template += $templateCache.get('CategoriesRoot');

  var copyClassificationData = angular.copy(Data.sharedData.classificationData);
  updateId(scope.controls.properties.id, Data.uniqueProperty, copyClassificationData);

  Data.ClassificationDataAdded.push({
    controlId: scope.controls.properties.id,
    uniqueProperty: Data.uniqueProperty,
    classification: copyClassificationData
  });

  scope.controls.categorieschildren = copyClassificationData;

  return template;
}
