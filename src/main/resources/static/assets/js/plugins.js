/*
Template Name: Velzon - Admin & Dashboard Template
Author: Themesbrand
Version: 2.4.0
Website: https://Themesbrand.com/
Contact: Themesbrand@gmail.com
File: Common Plugins Js File
*/

//Common plugins
(function() {
  var loadScript = function(src) { var s = document.createElement('script'); s.src = src; document.head.appendChild(s); };
  var hasToast = document.querySelectorAll("[toast-list]").length > 0;
  var hasChoices = document.querySelectorAll('[data-choices]').length > 0;
  var hasProvider = document.querySelectorAll("[data-provider]").length > 0;
  if (hasToast || hasChoices || hasProvider) {
    loadScript('https://cdn.jsdelivr.net/npm/toastify-js');
  }
  if (hasChoices) {
    loadScript('assets/libs/choices.js/public/assets/scripts/choices.min.js');
  }
  if (hasProvider) {
    loadScript('assets/libs/flatpickr/flatpickr.min.js');
  }
})();