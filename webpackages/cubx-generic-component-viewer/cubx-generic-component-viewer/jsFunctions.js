/**
 * Created by ega on 13.05.2016.
 */
(function () {
  'use strict';
  // set namespace containing cubx-component-viewer functions
  window.com_incowia_cubx_data_flow_viewer = {
    showTooltip: function (evt, htmlContent) {
      var tooltip = document.getElementById('info_tooltip');
      tooltip.style.top = (evt.clientY + 12) + 'px';
      tooltip.style.left = (evt.clientX + 12) + 'px';
      tooltip.innerHTML = htmlContent;
      tooltip.style.display = 'block';
    },

    hideTooltip: function () {
      var tooltip = document.getElementById('info_tooltip');
      tooltip.style.display = 'none';
    }
  };
})();
