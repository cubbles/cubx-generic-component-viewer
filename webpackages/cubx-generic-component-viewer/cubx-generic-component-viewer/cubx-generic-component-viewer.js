/* global $, d3, klay, XMLSerializer, Blob, saveAs */
(function () {
  'use strict';
  /**
   * Get help:
   * > Lifecycle callbacks:
   * https://www.polymer-project.org/1.0/docs/devguide/registering-elements.html#lifecycle-callbacks
   *
   * Access the Cubbles-Component-Model:
   * > Access slot values:
   * slot 'a': this.getA(); | this.setA(value)
   */
  CubxPolymer({
    is: 'cubx-generic-component-viewer',

    _cubxReady: false,
    _maxRootComponentSlotWidth: 0,
    HEADER_MARGIN: 10,
    ROOT_COMPONENT_NAME_FONT: {size: 16, family: 'arial'},
    MEMBER_COMPONENT_NAME_FONT: {size: 12, family: 'arial'},
    MEMBER_ID_NAME_FONT: {size: 16, family: 'arial', weight: 'bold'},
    DEFAULT_TITLE: {
      whenIsCompound: 'Dataflow view',
      whenIsElementary: 'Interface view'
    },
    VIEW_HOLDER_ID: 'component_view_holder',
    SLOT_LABELS_SPACE: 40,
    SLOT_LABEL_FONT: {size: 12, family: 'arial'},
    SLOT_RADIUS: 5,
    SLOTS_AREA_MARGIN: 10,
    SLOT_SPACE: 11,
    CONNECTION_LABEL_FONT: {size: 10, family: 'arial'},
    CONNECTION_LABEL_MARGIN: 10,
    ROOT_COMPONENT_CONFIG: {
      portLabelPlacement: 'OUTSIDE',
      borderSpacing: 70
    },
    MEMBER_PORT_CONSTRAINTS: 'FIXED_SIDE',
    MEMBER_PORT_LABEL_PLACEMENT: 'INSIDE',
    MEMBER_LABEL_PLACEMENT: 'V_TOP H_CENTER',
    MEMBER_PORT_ALIGNMENT: 'BEGIN',
    AD_HOC_COMPONENT: {artifactId: 'ad-hoc-component', slots: [], webpackageId: ''},
    HIGHLIGHTED_CSS_CLASS: 'highlighted',
    GRAYED_OUT_CSS_CLASS: 'grayed-out',
    MINIMAP_ID: 'minimapDiagram',
    MINIMAP_SCALE: 0.3,
    DEFAULT_VIEWER_STYLE: {
      heightProportion: 0.7,
      overflow: 'hidden',
      resize: 'vertical',
      width: '100%'
    },

    /**
     * Manipulate an element’s local DOM when the element is created.
     */
    created: function () {
      this.SLOT_DIAMETER = this.SLOT_RADIUS * 2;
    },

    /**
     * Manipulate an element’s local DOM when the element is created and initialized.
     */
    ready: function () {
    },

    /**
     * Manipulate an element’s local DOM when the element is attached to the document.
     */
    attached: function () {
      this._setInitialStyleToViewHolder();
    },

    /**
     * Manipulate an element’s local DOM when the cubbles framework is initialized and ready to work.
     */
    cubxReady: function () {
      this._cubxReady = true;
      this._disconnectedSlotsHidden = false;
    },

    /**
     *  Observe the Cubbles-Component-Model: If value for slot 'viewerWidth' has changed ...
     */
    modelViewerWidthChanged: function (viewerWidth) {
      this._setViewHolderWidth(viewerWidth);
    },

    /**
     *  Observe the Cubbles-Component-Model: If value for slot 'viewerHeight' has changed ...
     */
    modelViewerHeightChanged: function (viewerHeight) {
      this._setViewHolderHeight(viewerHeight);
    },

    /**
     *  Observe the Cubbles-Component-Model: If value for slot 'scale' has changed ...
     */
    modelScaleChanged: function (scale) {
      if (this._viewerIsReady()) {
        this._processScale(scale);
      }
    },

    /**
     *  Observe the Cubbles-Component-Model: If value for slot 'definitions' has changed ...
     */
    modelDefinitionsChanged: function (definitions) {
      this._startWorking();
    },

    /**
     *  Observe the Cubbles-Component-Model: If value for slot 'highlightedMember' has changed ...
     */
    modelHighlightedMemberChanged: function (highlightedMemberId) {
      if (this._viewerIsReady()) {
        this._highlightMember(highlightedMemberId);
      }
    },

    _setInitialStyleToViewHolder: function () {
      this._setViewHolderWidth(this.getViewerWidth() || this.DEFAULT_VIEWER_STYLE.width);
      this._setViewHolderHeight(this.getViewerHeight() || this._getDefaultViewerHeight());
      this._getViewHolder().style.overflow = this.DEFAULT_VIEWER_STYLE.overflow;
      this._getViewHolder().style.resize = this.DEFAULT_VIEWER_STYLE.resize;
    },

    _getDefaultViewerHeight: function () {
      return this._getProportionOfNumberInPixels(
        this.parentNode.clientHeight,
        this.DEFAULT_VIEWER_STYLE.heightProportion
      );
    },

    _getProportionOfNumberInPixels: function (number, proportion) {
      return this._getProportionOfNumber(number, proportion) + 'px';
    },

    _getProportionOfNumber: function (number, proportion) {
      return number * proportion;
    },

    /**
     * Process a scale value to then scale the viewerDiagram correctly
     * @param {string} scale - Scale to be applied
     * @private
     */
    _processScale: function (scale) {
      if (!this._isValidScale(scale)) {
        console.error('Invalid value of scale. Possible values are \'none\', \'auto\', or a positive float ' +
          'passed as STRING.');
        return;
      }
      if (scale === 'none') {
        return;
      }
      if (scale === 'auto') {
        this.viewerDiagram.autoScaleAndCenterDiagram();
      } else {
        this.viewerDiagram.applyScaleWithTransition(scale);
      }
    },

    /**
     * @param {string} scale - Scale to be validated
     * @returns {boolean} True if scale is valid, otherwise false
     * @private
     */
    _isValidScale: function (scale) {
      if (!scale) {
        return false;
      } else if (scale === 'auto' || scale === 'none') {
        return true;
      } else {
        return (isNaN(parseFloat(scale)));
      }
    },

    _setViewHolderWidth: function (viewerWidth) {
      this._setDimensionsToHtmlElement(this._getViewHolder(), {width: viewerWidth});
    },

    _setViewHolderHeight: function (viewerHeight) {
      if (viewerHeight.indexOf('%') !== -1) {
        var proportion = parseInt(viewerHeight.substring(0, viewerHeight.indexOf('%'))) / 100;
        viewerHeight = this._getProportionOfNumber(this.parentNode.clientHeight, proportion);
      }
      this._setDimensionsToHtmlElement(this._getViewHolder(), {height: viewerHeight});
    },

    _viewerIsReady: function () {
      return this.status === 'ready';
    },

    _getViewHolder: function () {
      if (!this._viewHolder) {
        this._viewHolder = this.$$('#' + this.VIEW_HOLDER_ID);
      }
      return this._viewHolder;
    },

    /**
     * Build the object containing components definitions, set this._component value and update view
     * @private
     */
    _startWorking: function () {
      this.status = 'init';
      if (this.getDefinitions().componentArtifactId) {
        this._component = this.getDefinitions().components[this.getDefinitions().componentArtifactId];
        if (this._component) {
        } else {
          console.error('The component with ' + this.getDefinitions().componentArtifactId +
            ' artifactId was not found in definitions');
        }
      } else {
        this._component = this.AD_HOC_COMPONENT;
      }
      this._resetViewer();
    },

    /**
     * Update the viewer title and displayed component
     * @private
     */
    _resetViewer: function () {
      this._resetMaxRootComponentSlotWidth();
      this._updateViewerTitle();
      this._drawComponent(this._generateComponentGraph());
    },

    _resetMaxRootComponentSlotWidth: function () {
      this._maxRootComponentSlotWidth = 0;
    },

    _updateViewerTitle: function () {
      if (this.getShowTitle()) {
        if (!this.getViewerTitle()) {
          this.setViewerTitle(this._getDefaultViewerTitle());
        }
        this._displayPageTitle();
      }
    },

    /**
     * Display provided title or default titles
     * @private
     */
    _displayPageTitle: function () {
      this.$$('#' + this.VIEW_HOLDER_ID + '_title').style.display = 'inline-block';
    },

    _getDefaultViewerTitle: function () {
      if (this._rootComponentIsCompound()) {
        return (this.DEFAULT_TITLE.whenIsCompound);
      } else {
        return (this.DEFAULT_TITLE.whenIsElementary);
      }
    },

    _rootComponentIsCompound: function () {
      return this.getDefinitions().hasOwnProperty('members');
    },

    /**
     * Generate the KGraph that represents a component represented by this._component (which can
     * also be an ad-hoc component)
     * @private
     */
    _generateComponentGraph: function () {
      var componentGraph = {id: 'root', children: []};
      componentGraph.children.push(this._generateRootComponent());
      componentGraph.edges = this._generateGraphConnections(
        this.getDefinitions().connections || [],
        this.getDefinitions().componentArtifactId || ''
      );
      return componentGraph;
    },

    _generateRootComponent: function () {
      var rootComponent = this._generateGraphMember(
        this._component,
        undefined,
        this.ROOT_COMPONENT_CONFIG
      );
      rootComponent.children = this._generateGraphMembers();
      return rootComponent;
    },

    /**
     * Generate a list of GraphMembers (KNodes) using for each member in
     * this.getDefinitions().members
     * @private
     */
    _generateGraphMembers: function () {
      var graphMembers = [];
      if (this.getDefinitions().members) {
        this.getDefinitions().members.forEach(addMemberToGraph.bind(this));
      }

      function addMemberToGraph (member) {
        var componentDefOfMember = this._getComponentDefOfMember(member);
        graphMembers.push(this._generateGraphMember(componentDefOfMember, member));
      }

      return graphMembers;
    },

    /**
     * Get the component definition of a member from 'this.getDefinitions()._components', based on its artifactId
     * @param {object} member - Member to be used to get component definition
     * @returns {*} component definition
     * @private
     */
    _getComponentDefOfMember: function (member) {
      return this._getDefinitionOfComponent(this._getComponentArtifactIdOfMember(member));
    },

    _getDefinitionOfComponent: function (componentArtifactId) {
      if (this.getDefinitions().components.hasOwnProperty(componentArtifactId)) {
        return this.getDefinitions().components[componentArtifactId];
      } else {
        console.error('The component definition of the member with artifactId: \'' +
          componentArtifactId + '\' was not found in definitions.');
      }
    },

    _getComponentArtifactIdOfMember: function (member) {
      return member.componentId
        ? member.componentId.substr(member.componentId.indexOf('/') + 1)
        : member.artifactId;
    },

    /**
     * Generate a GraphMember (KNode) that represents a Component
     * @param {string} component - Component to be represented as GraphMember
     * @param {object} member - Member of a compoundComponent
     * @param {object} [optionals] - Optional parameters
     * @returns {object} GraphMember (Knode)
     * @private
     */
    _generateGraphMember: function (component, member, optionals) {
      var memberId;
      if (member) {
        memberId = member.memberId;
      }
      var graphMemberSlots = this._generateGraphMemberSlots(component, component.artifactId, memberId);
      var artifactId = component.artifactId;
      var header = this._generateComponentHeader(memberId, component.webpackageId, artifactId);

      return {
        id: memberId || component.artifactId,
        labels: header.labels,
        width: calculateWidthOfMember(this.SLOT_LABELS_SPACE),
        height: calculateHeightOfMember(),
        ports: graphMemberSlots.slots,
        headerHeight: header.height,
        properties: {
          portConstraints: this.MEMBER_PORT_CONSTRAINTS,
          portLabelPlacement: determinePortLabelPlacement(this.MEMBER_PORT_LABEL_PLACEMENT),
          nodeLabelPlacement: this.MEMBER_LABEL_PLACEMENT,
          portAlignment: this.MEMBER_PORT_ALIGNMENT,
          portSpacing: this.SLOT_SPACE,
          additionalPortSpace: calculateAdditionalPortSpace(this.SLOTS_AREA_MARGIN),
          borderSpacing: determineBorderSpacing()
        }
      };

      function calculateWidthOfMember (slotLabelsSpace) {
        return Math.max(graphMemberSlots.slotsWidth + slotLabelsSpace, header.width);
      }

      function calculateHeightOfMember () {
        return graphMemberSlots.slotsHeight + header.height;
      }

      function determinePortLabelPlacement (defaultPortLabelPlacement) {
        return optionals && optionals.portLabelPlacement
          ? optionals.portLabelPlacement
          : defaultPortLabelPlacement;
      }

      function calculateAdditionalPortSpace (slotsAreaMargin) {
        return 'top=' + (header.height + slotsAreaMargin * 1.5) +
          ', bottom=' + slotsAreaMargin + ',left=0,right=0';
      }

      function determineBorderSpacing () {
        return optionals && optionals.borderSpacing ? optionals.borderSpacing : 0;
      }
    },

    /**
     * Generate the labels array of the component header and calculate its width
     * @param memberId - Member id, if it is a member
     * @param webpackageId - webpackageQName@version
     * @param artifactId - Artifact id of the component
     * @returns {{labels: *[], width: number}}
     * @private
     */
    _generateComponentHeader: function (memberId, webpackageId, artifactId) {
      var headerLabels = this._generateComponentHeaderLabels(memberId, webpackageId, artifactId);
      return {
        labels: headerLabels,
        width: calculateHeaderWidth(headerLabels, this.HEADER_MARGIN),
        height: calculateHeaderHeight(headerLabels, this.HEADER_MARGIN)
      };

      function calculateHeaderHeight (headerLabels, headerMargin) {
        var headerHeight = 0;
        headerLabels.forEach(function (headerLabel) {
          headerHeight += headerLabel.height;
        });
        headerHeight += headerMargin * 2; // Top and bottom margin
        return headerHeight;
      }

      function calculateHeaderWidth (headerLabels, headerMargin) {
        var headerWidth = 0;
        headerLabels.forEach(function (headerLabel) {
          headerWidth = Math.max(headerWidth, headerLabel.width);
        });
        headerWidth += headerMargin * 2; // Left and right margin
        return headerWidth;
      }
    },

    _generateComponentHeaderLabels: function (memberId, webpackageId, artifactId) {
      var memberIdLabel;
      var webpackageIdLabel;
      var artifactIdLabel;
      webpackageId = webpackageId ? ':' + webpackageId : '';
      artifactId = '/' + artifactId;
      if (memberId) {
        memberIdLabel = this._createViewerLabel(memberId, this.MEMBER_ID_NAME_FONT, 'memberIdLabel');
        webpackageIdLabel = this._createViewerLabel(webpackageId, this.MEMBER_COMPONENT_NAME_FONT, 'componentNameLabel');
        artifactIdLabel = this._createViewerLabel(artifactId, this.MEMBER_COMPONENT_NAME_FONT, 'componentNameLabel');
      } else {
        memberIdLabel = this._createViewerLabel('', {}, 'memberIdLabel');
        webpackageIdLabel = this._createViewerLabel(webpackageId, this.ROOT_COMPONENT_NAME_FONT, 'componentNameRootLabel');
        artifactIdLabel = this._createViewerLabel(artifactId, this.ROOT_COMPONENT_NAME_FONT, 'componentNameRootLabel');
      }
      return [memberIdLabel, webpackageIdLabel, artifactIdLabel];
    },

    /**
     * Create a label with the necessary properties to be displayed by the viewer
     * @param {string} text - Text of the label
     * @param {object} fontObject - {size: number, family: string, weight: string},
     * @param {string} className - css class
     * @returns {{text: string, width: number, height: number, className: string, fontObject: {}}}
     * @private
     */
    _createViewerLabel: function (text, fontObject, className) {
      return {
        text: text,
        width: this._getTextWidth(text, this._fontObjectToString(fontObject)),
        height: text && fontObject.size ? fontObject.size : 0,
        className: className || '',
        fontObject: fontObject || {}
      };
    },

    /**
     * Generate the slots (ports) of a GraphMember (KNode)
     * @param {object} component - Component that contains the slots
     * @param {string} artifactId - artifactId  of the component
     * @param {string} memberId - memberId  of the component (if it is a member of a compound, otherwise undefined)
     * @returns {{slots: Array, slotsWidth: number}} - List of slots and the width of the widest slot
     * @private
     */
    _generateGraphMemberSlots: function (component, artifactId, memberId) {
      var graphMemberSlots = [];
      var graphMemberSlot;
      var maxSlotWidthLeft = 0;
      var maxSlotWidthRight = 0;
      var inputSlots = 0;
      var outputSlots = 0;
      var slotLabelWidth;
      for (var l = 0; l < component.slots.length; l++) {
        for (var m = 0; m < component.slots[l].direction.length; m++) {
          slotLabelWidth = this._getTextWidth(component.slots[l].slotId, this._fontObjectToString(this.SLOT_LABEL_FONT));
          if (component.slots[l].direction[m] === 'input') {
            maxSlotWidthLeft = Math.max(slotLabelWidth, maxSlotWidthLeft);
            if (!memberId) {
              this._maxRootComponentSlotWidth = maxSlotWidthLeft;
            }
            inputSlots++;
          } else {
            maxSlotWidthRight = Math.max(slotLabelWidth, maxSlotWidthRight);
            outputSlots++;
          }
          graphMemberSlot = this._generateGraphMemberSlot(
            component.slots[l], component.slots[l].direction[m], memberId || artifactId
          );
          graphMemberSlots.push(graphMemberSlot);
        }
      }
      return {
        slots: graphMemberSlots,
        slotsWidth: maxSlotWidthLeft + maxSlotWidthRight,
        slotsHeight: Math.max(inputSlots, outputSlots) * (this.SLOT_DIAMETER + this.SLOT_SPACE) + this.SLOTS_AREA_MARGIN
      };
    },

    /**
     * Generate a slot (port) of a component (KNode)
     * @param {string} slot - Slot to be displayed
     * @param {string} direction - direction of the slot (input, output)
     * @param {string} componentId - Identifier of the component (memberId or artifactId for root component)
     * @returns {object} Generated slot (port)
     * @private
     */
    _generateGraphMemberSlot: function (slot, direction, componentId) {
      return {
        id: slot.slotId + '_' + componentId + '_' + direction,
        properties: {
          portSide: (direction === 'input') ? 'WEST' : 'EAST',
          portAnchor: (direction === 'input') ? '(0.0, 0.5)' : '(0.0, 0.5)'
        },
        labels: [this._createViewerLabel(slot.slotId, this.SLOT_LABEL_FONT, '')],
        height: this.SLOT_DIAMETER,
        tooltipHTML: '<strong>Description:</strong> ' + (slot.description || '-') +
        '<br>' + '<strong>Type:</strong> ' + (slot.type || '-')
      };
    },

    /**
     * Generate the connections (edges) using a list of connections of a compound component
     * @param {Array} connections - List of connections of a compound (or ad-hoc) component
     * @param {string} compoundId - artifactId of the compound component
     * @returns {Array} Generated connections
     * @private
     */
    _generateGraphConnections: function (connections, compoundId) {
      var graphConnections = [];
      connections.forEach(function (connection) {
        graphConnections.push(this._generateGraphConnection(connection, compoundId));
      }.bind(this));
      return graphConnections;
    },

    /**
     * Generate a graph connection (edge) of a compound component
     * @param {object} compoundConnection - Connection within the compound component
     * @param {string} compoundId - artifactId of the compound component
     * @returns {object} Generated connection
     * @private
     */
    _generateGraphConnection: function (compoundConnection, compoundId) {
      var source;
      var sourcePort = compoundConnection.source.slot + '_';
      if (compoundConnection.source.memberIdRef) {
        source = compoundConnection.source.memberIdRef;
        sourcePort += compoundConnection.source.memberIdRef + '_' + 'output';
      } else {
        source = compoundId;
        sourcePort += compoundId + '_' + 'input';
      }
      var target;
      var targetPort = compoundConnection.destination.slot + '_';
      if (compoundConnection.destination.memberIdRef) {
        target = compoundConnection.destination.memberIdRef;
        targetPort += compoundConnection.destination.memberIdRef + '_' + 'input';
      } else {
        target = compoundId;
        targetPort += compoundId + '_' + 'output';
      }
      return {
        id: compoundConnection.connectionId,
        labels: [this._createViewerLabel(determineConnectionIdLabel(compoundConnection.connectionId),
          this.CONNECTION_LABEL_FONT, '')],
        source: source,
        sourcePort: sourcePort,
        target: target,
        targetPort: targetPort,
        hookFunction: compoundConnection.hookFunction || '',
        tooltipHTML: determineToolTip(compoundConnection),
        highlighted: false
      };

      function determineConnectionIdLabel (connectionId) {
        return connectionId.length > 50 ? connectionId.slice(0, 50) + '...' : connectionId;
      }

      function determineToolTip (compoundConnection) {
        var html = '';
        if (compoundConnection.connectionId.length > 50) {
          html += '<strong>Connection Id:</strong><p>' + compoundConnection.connectionId + '</p>';
        }
        if (compoundConnection.hookFunction) {
          html += '<strong>Hook function:</strong><p>' + compoundConnection.hookFunction + '</p>';
        }
        return html;
      }
    },

    /**
     * Build and append all the graphic elements of a component described by a Kgraph
     * @param {object} componentGraph - JSON KGraph to be displayed
     * @private
     */
    _drawComponent: function (componentGraph) {
      // group
      d3.select('#' + this.VIEW_HOLDER_ID).html('');
      var self = this;
      var svg = d3.select('#' + this.VIEW_HOLDER_ID)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%');
      var viewHolder = $('#' + this.VIEW_HOLDER_ID);
      var realWidth = viewHolder.width();
      var realHeight = viewHolder.height();
      var g = svg.append('g');
      var root = g.append('g');
      var layouter = klay.d3kgraph()
        .size([realWidth, realHeight])
        .transformGroup(root)
        .options({
          intCoordinates: true,
          edgeRouting: 'ORTHOGONAL',
          nodeLayering: 'LONGEST_PATH',
          nodePlace: 'BRANDES_KOEPF',
          crossMin: 'LAYER_SWEEP',
          algorithm: 'de.cau.cs.kieler.klay.layered'
        });

      // Tooltip
      this.infoToolTip = d3.tip()
        .attr('class', 'info_tooltip ' + this.is)
        .offset([30, 0])
        .html(function (d) {
          return d.tooltipHTML;
        });
      this.infoToolTip.direction('e');

      svg.call(this.infoToolTip);
      this.viewerDiagram = new this.Diagram(svg, g);

      layouter.on('finish', function (d) {
        var components = layouter.nodes();
        var connections = layouter.links(components);
        var componentsData = root.selectAll('.node')
          .data(components, function (d) {
            return d.id;
          });

        var connectionsData = root.selectAll('.link')
          .data(connections, function (d) {
            return d.id;
          });

        self._drawMembers(componentsData);
        self._drawConnections(connectionsData);
        if (d3.selectAll('.disconnected')[0].length > 0) {
          self.$$('#hideDisconnectedB').style.display = 'inline';
          self.$$('#hideDisconnectedB').removeAttribute('disabled');
        }
        if (self.getHighlightedMember()) {
          self._highlightMember(self.getHighlightedMember());
        }
        self.status = 'ready';
      });
      layouter.kgraph(componentGraph);
    },

    /**
     * Draw a square for each component and its id as label
     * @param {Object} componentsData - Data of each component (D3)
     * @private
     */
    _drawMembers: function (componentsData) {
      var self = this;
      var componentView = componentsData.enter()
        .append('g')
        .attr('id', function (d) {
          return d.id;
        })
        .attr('class', function (d) {
          var classList = '';
          if (d.children) {
            classList += 'componentView root ';
          } else {
            classList += 'componentView member ';
          }
          classList += self.is;
          return classList;
        })
        .on('click', function (d) {
          if (d3.event.defaultPrevented) {
            return;
          }
          if (d.children) {
            self._resetHighlightingAndGrayOut();
          } else {
            self._highlightMember(d.id);
          }
        });

      var atoms = componentView.append('rect')
        .attr('class', function (d) {
          var classList = '';
          if (d.id !== 'root') {
            if (d.children) {
              classList += 'componentViewAtom root ';
            } else {
              classList += 'componentViewAtom member ';
            }
          }
          classList += self.is;
          return classList;
        });

      var headingAtom = componentView.append('g')
        .attr('class', 'headingAtom ' + self.is);

      headingAtom.transition()
        .attr('width', function (d) {
          return d.width;
        })
        .attr('height', function (d) {
          return d.headerHeight;
        });

      var splitLine = componentView.append('line')
        .attr('class', 'splitLine ' + self.is);

      splitLine.transition()
        .attr('x1', 0)
        .attr('x2', function (d) {
          return d.width;
        })
        .attr('y1', function (d) {
          return d.headerHeight;
        })
        .attr('y2', function (d) {
          return d.headerHeight;
        });

      // Apply componentView positions
      componentView.transition()
        .attr('transform', function (d) {
          return 'translate(' + (d.x || 0) + ' ' + (d.y || 0) + ')';
        });

      atoms.transition()
        .attr('width', function (d) {
          return d.width;
        })
        .attr('height', function (d) {
          return d.height;
        })
        .each('end', function (d) {
          if (d.id === 'root') {
            self._generateMinimapElements();
            self.viewerDiagram.setReflectedDiagram(self.minimapNavigator, 1 / self.MINIMAP_SCALE);
            self.viewerDiagram.setZoomBehavior([self.viewerDiagram.calculateAutoScale(), Infinity]);
            self.viewerDiagram.autoScaleAndCenterDiagram();
            self.viewerDiagram.initialPosition = self.viewerDiagram.calculateCenterCoordinates();
          }
        });

      // Nodes labels
      var componentViewLabel = headingAtom.selectAll('.componentViewHeaderLabel')
        .data(function (d) {
          return d.labels || [];
        })
        .enter()
        .append('text')
        .text(function (d) {
          return d.text;
        })
        .attr('class', function (d) {
          return 'componentViewHeaderLabel ' + d.className + ' ' + self.is;
        })
        .attr('font-size', function (d) {
          return d.fontObject.size;
        })
        .attr('font-weight', function (d) {
          return d.fontObject.weight;
        })
        .attr('font-style', function (d) {
          return d.fontObject.style;
        })
        .attr('font-family', function (d) {
          return d.fontObject.family;
        });

      componentViewLabel.transition()
        .attr('x', function (d, i, j) {
          return componentViewLabel[j].parentNode.__data__.width / 2;
        })
        .attr('y', function (d) {
          return d.y + d.height + self.HEADER_MARGIN;
        });

      this._drawComponentsSlots(componentsData);
    },

    /**
     * Draw the components' slots and their ids as labels
     * @param {Object} componentsData - Data of each component (D3)
     * @private
     */
    _drawComponentsSlots: function (componentsData) {
      var self = this;

      // slots
      var slotView = componentsData.selectAll('.slotView')
        .data(function (d) {
          return d.ports || [];
        })
        .enter()
        .append('g')
        .attr('id', function (d) {
          return d.id;
        })
        .attr('class', 'slotView disconnected ' + self.is);

      slotView.append('circle')
        .attr('class', 'slotViewAtom ' + self.is)
        .attr('r', self.SLOT_RADIUS)
        .on('mouseover', self.infoToolTip.show)
        .on('mouseout', self.infoToolTip.hide);

      // slots labels
      slotView.selectAll('.slotViewLabel')
        .data(function (d) {
          return d.labels;
        })
        .enter()
        .append('text')
        .text(function (d) {
          return d.text;
        })
        .attr('text-anchor', function (d) {
          return (d.x > 0) ? 'start' : 'end';
        })
        .attr('x', function (d) {
          return (d.x > 0) ? d.x + self.SLOT_RADIUS : -self.SLOT_DIAMETER;
        })
        .attr('y', function (d) {
          return Math.abs(d.height / 2 - self.SLOT_RADIUS / 2);
        })
        .attr('class', 'slotViewLabel ' + self.is)
        .attr('font-size', function (d) {
          return d.fontObject.size;
        })
        .attr('font-weight', function (d) {
          return d.fontObject.weight;
        })
        .attr('font-style', function (d) {
          return d.fontObject.style;
        })
        .attr('font-family', function (d) {
          return d.fontObject.family;
        });

      slotView.transition()
        .attr('transform', function (d, i, j) {
          if (d.properties.portSide === 'EAST' && d.x === 0) {
            d.x = slotView[j].parentNode.__data__.width;
          }
          return 'translate(' + (d.x || 0) + ' ' + (d.y || 0) + ')';
        });
    },

    _addArrowDefinitionsToViewer: function () {
      this.viewerDiagram.svgContainer.append('svg:defs').selectAll('marker')
        .data(['end'])                 // define connectionView/path types
        .enter().append('svg:marker')    // add arrows
        .attr('id', String)
        .attr('class', this._addComponentTagNameToClassName('arrowEnd'))
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 10)
        .attr('refY', 0)
        .attr('markerWidth', 5)        // marker settings
        .attr('markerHeight', 5)
        .attr('orient', 'auto')  // arrowhead color
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5');
    },

    _createConnectionGroup: function (connectionData) {
      var self = this;
      var d3Container = connectionData.enter();
      var connectionGroup = this._createD3Element('g', d3Container, 'connectionView group');
      connectionGroup.attr('data-source-member-id', function (d) {
        return d.source;
      })
        .attr('data-destination-member-id', function (d) {
          return d.target;
        })
        .on('mouseover', function (d) {
          self._highlightElement(d3.select(this).selectAll('path'));
        })
        .on('mouseout', function (d) {
          self._undoHighlightElement(d3.select(this).selectAll('path'), d);
        })
        .on('click', function (d) {
          handleConnectionClick(d3.select(this).selectAll('path'), d);
        });
      function handleConnectionClick (d3select, d) {
        d.highlighted = !d.highlighted;
        if (d.highlighted) {
          self._highlightElement(d3select);
        } else {
          self._undoHighlightElement(d3select, d);
        }
      }
      return connectionGroup;
    },

    _createConnectionView: function (connectionGroup) {
      var connectionView = this._createD3Element('path', connectionGroup, 'connectionView');
      connectionView.attr('id', function (d) {
        // Remove disconnected class to source and target slots
        d3.select('#' + d.sourcePort).classed('disconnected', false);
        d3.select('#' + d.targetPort).classed('disconnected', false);
        return d.id;
      })
        .attr('d', 'M0 0')
        .attr('marker-end', 'url(#end)');
      return connectionView;
    },

    _createConnectionViewLabel: function (connectionGroup) {
      var connectionViewLabel = this._createD3Element('text', connectionGroup, 'connectionViewLabel');
      connectionViewLabel.text(function (d) {
        return d.labels[0].text + (d.tooltipHTML ? '\t🛈' : '') || '';
      })
        .attr('font-size', function (d) {
          return d.labels[0].fontObject.size;
        })
        .attr('font-weight', function (d) {
          return d.tooltipHTML ? 'bold' : d.labels[0].fontObject.weight;
        })
        .attr('font-style', function (d) {
          return d.labels[0].fontObject.style;
        })
        .attr('font-family', function (d) {
          return d.labels[0].fontObject.family;
        });
      return connectionViewLabel;
    },

    _addTransitionToConnectionViewLabel: function (connectionViewLabel) {
      var self = this;
      connectionViewLabel.transition()
        .attr('transform', function (d) {
          var x = d.labels[0].x + self._maxRootComponentSlotWidth + self.CONNECTION_LABEL_MARGIN;
          var y = d.labels[0].y + d.labels[0].height * 2.5;
          return 'translate(' + x + ' ' + y + ')';
        });
    },

    _setUpConnectionViewLabelTooltip: function (connectionViewLabel) {
      connectionViewLabel.filter(function (d) {
        return d.tooltipHTML;
      })
        .on('mouseover', this.infoToolTip.show)
        .on('mouseout', this.infoToolTip.hide);
    },

    _createD3Element: function (tagName, container, className, dimensions) {
      var d3Element = container.append(tagName);
      if (className) {
        d3Element.attr('class', this._addComponentTagNameToClassName(className));
      }
      if (dimensions) {
        this._setDimensionsToHtmlElement(d3Element.node(), dimensions);
      }
      return d3Element;
    },

    _addRoutesToConnections: function (connectionView) {
      var self = this;
      connectionView.transition().attr('d', function (d) {
        var path = '';
        path += 'M' + (d.sourcePoint.x + self.SLOT_RADIUS) + ' ' + d.sourcePoint.y + ' ';
        (d.bendPoints || []).forEach(function (bp, i) {
          path += 'L' + bp.x + ' ' + bp.y + ' ';
        });
        path += 'L' + (d.targetPoint.x - self.SLOT_RADIUS) + ' ' + d.targetPoint.y + ' ';
        return path;
      });
    },

    /**
     * Draw the connections and their ids as labels
     * @param {Object} connectionData - Data of each connection (D3)
     * @private
     */
    _drawConnections: function (connectionData) {
      this._addArrowDefinitionsToViewer();
      var connectionGroup = this._createConnectionGroup(connectionData);
      var connectionView = this._createConnectionView(connectionGroup);
      var connectionViewLabel = this._createConnectionViewLabel(connectionGroup);
      this._addTransitionToConnectionViewLabel(connectionViewLabel);
      this._setUpConnectionViewLabelTooltip(connectionViewLabel);
      this._addRoutesToConnections(connectionView);
    },

    /**
     * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
     *
     * @param {string} text - The text to be rendered.
     * @param {string} font - The css font descriptor that text is to be rendered with (e.g. 'bold 14px verdana')
     * @returns {number} width of the string
     * @private
     * @see http://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
     */
    _getTextWidth: function (text, font) {
      // re-use canvas object for better performance
      var canvas = this.canvas || (this.canvas = document.createElement('canvas'));
      var context = canvas.getContext('2d');
      context.font = font;
      var metrics = context.measureText(text);
      return metrics.width * 1.15;
    },

    /**
     * Returns a css font descriptor given an object
     * @param {object} fontObject - Object that has the properties of the font
     * @returns {string} css font descriptor
     * @private
     */
    _fontObjectToString: function (fontObject) {
      var fontString = '';
      if (fontObject.size) fontString += fontObject.size + 'px ';
      if (fontObject.family) fontString += fontObject.family + ' ';
      if (fontObject.weight) fontString += fontObject.weight + ' ';
      if (fontObject.style) fontString += fontObject.style + ' ';
      return fontString;
    },

    /**
     * Zoom and center the viewerDiagram to fit within container
     * @private
     */
    _zoomToFit: function () {
      this.viewerDiagram.autoScaleAndCenterDiagram();
    },

    /**
     * Save the viewerDiagram as svg file
     * @private
     */
    _saveAsSvg: function () {
      var svg = this.viewerDiagram.getSvgContainerNode().cloneNode(true);
      var serializedSvg = this._serializeSvg(svg);
      serializedSvg = this._addStyleToSerializedSvg(serializedSvg);
      serializedSvg = this._addNamespacesToSerializedSvg(serializedSvg);
      serializedSvg = this._addXmlDeclarationToSerializedSvg(serializedSvg);
      var blob = this._createBlobForSerializedSvg(serializedSvg);
      saveAs(blob, this._component.artifactId + '.svg');
    },

    _createBlobForSerializedSvg: function (serializedSvg) {
      return new Blob([serializedSvg], {type: 'image/svg+xml'});
    },

    _addXmlDeclarationToSerializedSvg: function (serializedSvg) {
      return '<?xml version="1.0" standalone="no"?>\r\n' + serializedSvg;
    },

    _addNamespacesToSerializedSvg: function (serializedSvg) {
      if (!serializedSvg.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
        return serializedSvg.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      if (!serializedSvg.match(/^<svg[^>]+"http:\/\/www\.w3\.org\/1999\/xlink"/)) {
        return serializedSvg.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
      }
    },

    _addStyleToSerializedSvg: function (serializedSvg) {
      return serializedSvg.replace(
        '</style>', '<![CDATA[' + this._getStylesStringOfComponent() + ']]>' + '</style>'
      );
    },

    _serializeSvg: function (svg) {
      var serializer = new XMLSerializer();
      svg.insertBefore(this._getDefsStyleElement(), svg.firstChild);
      return serializer.serializeToString(svg);
    },

    /**
     * Hide or show the disconnected slots
     * @param e
     * @private
     */
    _handleHIdeShowDisconnectedSlotsButton: function (e) {
      if (this._disconnectedSlotsHidden) {
        this._showDisconnectedSlots();
        this._updateHideShowDisconnectedSlotsToHide(e.currentTarget);
      } else {
        this._hideDisconnectedSlots();
        this._updateHideShowDisconnectedSlotsToShow(e.currentTarget);
      }
      this._disconnectedSlotsHidden = !this._disconnectedSlotsHidden;
    },

    _updateHideShowDisconnectedSlotsToHide: function (buttonElement) {
      this._updateHideShowDisconnectedSlotsButton(
        buttonElement, 'glyphicon-eye-open', 'glyphicon-eye-close', 'Hide disconnected slots'
      );
    },

    _updateHideShowDisconnectedSlotsToShow: function (buttonElement) {
      this._updateHideShowDisconnectedSlotsButton(
        buttonElement, 'glyphicon-eye-close', 'glyphicon-eye-open', 'Show disconnected slots'
      );
    },

    _updateHideShowDisconnectedSlotsButton: function (buttonElement, classToRemove, classToAdd, buttonText) {
      buttonElement.querySelector('i').classList.remove(classToRemove);
      buttonElement.querySelector('i').classList.add(classToAdd);
      buttonElement.querySelector('span').innerHTML = buttonText;
    },

    _hideDisconnectedSlots: function () {
      d3.selectAll('.disconnected').style('display', 'none');
    },

    _showDisconnectedSlots: function () {
      d3.selectAll('.disconnected').style('display', 'block');
    },

    /**
     * Creates a 'defs' element with an empty 'style' element inside
     * @returns {Element} - 'defs' element
     * @private
     */
    _getDefsStyleElement: function () {
      var styleEl = document.createElement('style');
      styleEl.setAttribute('type', 'text/css');
      var defsEl = document.createElement('defs');
      defsEl.appendChild(styleEl);
      return defsEl;
    },

    /**
     * Get a string with the styles definitions for the cubx-component-viewer element
     * @returns {string} - Css rules difinitions
     * @private
     */
    _getStylesStringOfComponent: function () {
      var styles = '';
      var styleSheets = document.styleSheets;
      var cssRules;
      var rule;
      if (styleSheets) {
        for (var i = 0; i < styleSheets.length; i++) {
          cssRules = styleSheets[i].cssRules;
          if (cssRules) {
            for (var j = 0; j < cssRules.length; j++) {
              rule = cssRules[j];
              if (rule.type === 1) {
                styles += '\n' + rule.cssText;
              }
            }
          }
        }
      }
      return styles;
    },

    /**
     * Determine the list of memberIds of the members, which are not connected to the member
     * identified by 'memberId'
     * @param {string} memberId - MemberId of the reference component
     * @returns {Array}
     * @private
     */
    _getNonConnectedMembersIds: function (memberId) {
      var nonConnectedMembersIds = [];
      var connectedMembersIds = this._getConnectedMembersIds(memberId);
      this.getDefinitions().members.forEach(function (member) {
        if (member.memberId !== memberId && connectedMembersIds.indexOf(member.memberId) === -1) {
          nonConnectedMembersIds.push(member.memberId);
        }
      });
      return nonConnectedMembersIds;
    },

    /**
     * Determine the list of memberIds of the members, which are connected to the member
     * identified by 'memberId'
     * @param {string} memberId - MemberId of the reference component
     * @returns {Array}
     * @private
     */
    _getConnectedMembersIds: function (memberId) {
      var connectedMembersIds = [];
      this.getDefinitions().connections.forEach(function (connection) {
        if (connection.source.memberIdRef && connection.source.memberIdRef === memberId) {
          connectedMembersIds.push(connection.destination.memberIdRef);
        }
      });
      return connectedMembersIds;
    },

    /**
     * Highlight a member and gray unconnected members out
     * @param {string} memberId - MemberId of the element to be highlighted
     * @private
     */
    _highlightMember: function (memberId) {
      this._resetHighlightingAndGrayOut();
      // normal # selector doesn't work for id starting with a number (i.e. for dynamic generated member ids)
      var memberBorder = d3.select('[id="' + memberId + '"] rect');
      if (!memberBorder.empty()) {
        this._highlightElement(memberBorder);
        this._grayOutNonDirectConnectedMembers(memberId);
      }
    },

    _grayOutNonDirectConnectedMembers: function (memberId) {
      var nonConnectedMembersIds = this._getNonConnectedMembersIds(memberId);
      nonConnectedMembersIds.forEach(function (nonConnectedMemberId) {
        var nonConnectedMember = d3.select('[id="' + nonConnectedMemberId + '"]');
        if (nonConnectedMember) {
          this._grayOutElement(nonConnectedMember);
          this._grayOutElement(d3.selectAll('[data-destination-member-id="' + nonConnectedMemberId + '"]'));
          this._grayOutElement(d3.selectAll('[data-source-member-id="' + nonConnectedMemberId + '"]'));
        }
      }.bind(this));
    },

    /** Highlight a element given by the 'd3select'
     * @param {object} d3select - D3 selection of the desired element
     * @private
     */
    _highlightElement: function (d3select) {
      d3select.classed(this.HIGHLIGHTED_CSS_CLASS, true);
    },

    /**
     * Remove the highlighting of an element given by the 'd3select'
     * @param {object} d3select - D3 selection of the desired element
     * @param {object} data - Data associated to the element
     * @private
     */
    _undoHighlightElement: function (d3select, data) {
      if (!data.highlighted) {
        d3select.classed(this.HIGHLIGHTED_CSS_CLASS, false);
      }
    },

    /** Gray an element out given by the 'd3select'
     * @param {object} d3select - D3 selection of the desired element
     * @private
     */
    _grayOutElement: function (d3select) {
      d3select.classed(this.GRAYED_OUT_CSS_CLASS, true);
    },

    /**
     * Remove the graying out of an element given by the 'd3select'
     * @param {object} d3select - D3 selection of the desired element
     * @private
     */
    _undoGrayOutElement: function (d3select) {
      d3select.classed(this.GRAYED_OUT_CSS_CLASS, false);
    },

    /**
     * Remove the graying out of all grayed out elements
     * @private
     */
    _undoGrayOutAllElements: function () {
      d3.selectAll('.' + this.GRAYED_OUT_CSS_CLASS).classed(this.GRAYED_OUT_CSS_CLASS, false);
    },

    /**
     * Remove the highlighting of all highlighted elements
     * @private
     */
    _undoHighlightAllElements: function () {
      d3.selectAll('.' + this.HIGHLIGHTED_CSS_CLASS).classed(this.HIGHLIGHTED_CSS_CLASS, false);
    },

    /**
     * Undo highlighting and gary out of members in the dataflow view
     * @private
     */
    _resetHighlightingAndGrayOut: function () {
      this._undoHighlightAllElements();
      this._undoGrayOutAllElements();
    },

    _createMinimapSvgContainer: function () {
      var minimapDimensions = this._determineMinimapDimensions();
      return this._createD3Element('svg', d3.select(this._getMinimapDivContainer()), 'frame-container', minimapDimensions);
    },

    _createMinimapFrame: function (minimapSvgContainer) {
      var minimapDimensions = this._determineMinimapDimensions();
      return this._createD3Element('rect', minimapSvgContainer, 'frame', minimapDimensions);
    },

    _addComponentTagNameToClassName: function (className) {
      return className + ' ' + this.is;
    },

    _addPxSuffixToNumber: function (number) {
      return number + 'px';
    },

    _determineMinimapDimensions: function () {
      return {
        width: this.viewerDiagram.getSvgContainerParentWidth() * this.MINIMAP_SCALE,
        height: this.viewerDiagram.getSvgContainerParentHeight() * this.MINIMAP_SCALE
      };
    },

    _setDimensionsToHtmlElement: function (element, dimensions) {
      if (dimensions.hasOwnProperty('width')) {
        element.style.width = this._getDimensionAsString(dimensions.width);
      }
      if (dimensions.hasOwnProperty('height')) {
        element.style.height = this._getDimensionAsString(dimensions.height);
      }
    },

    _getDimensionAsString: function (dimension) {
      if (typeof dimension === 'number') {
        return this._addPxSuffixToNumber(dimension);
      } else if (typeof dimension === 'string') {
        return dimension;
      } else {
        return Error('No valid width or height, it should be a number or css valid.', dimension);
      }
    },

    _getMinimapDivContainer: function () {
      return this.$$('#' + this.MINIMAP_ID);
    },

    _cloneViewerDiagram: function () {
      var clonedDiagramSvgContainer = d3.select(
        this._cloneHtmlElement(this.viewerDiagram.getSvgContainerNode(), true)
      );
      var clonedDiagramElement = clonedDiagramSvgContainer.select(':first-child');
      return new this.Diagram(clonedDiagramSvgContainer, clonedDiagramElement);
    },

    _cloneHtmlElement: function (node, removeIdAttribute) {
      var cloneElement = node.cloneNode(true);
      if (removeIdAttribute) {
        cloneElement.removeAttribute('id');
      }
      return cloneElement;
    },

    _appendMinimapDiagramToContainer: function () {
      this._getMinimapDivContainer().appendChild(this.minimapDiagram.getSvgContainerNode());
    },

    _createMinimapNavigator: function () {
      var minimapSvg = this._createMinimapSvgContainer();
      var minimapFrame = this._createMinimapFrame(minimapSvg);
      return new this.Diagram(minimapSvg, minimapFrame);
    },

    _generateMinimapElements: function () {
      this._setDimensionsToHtmlElement(this._getMinimapDivContainer(), this._determineMinimapDimensions());
      this._generateMinimapDiagram();
      this._generateMinimapNavigator();
    },

    _generateMinimapDiagram: function () {
      this.minimapDiagram = this._cloneViewerDiagram();
      this.minimapDiagram.setZoomBehavior();
      setTimeout(function () {
        this._appendMinimapDiagramToContainer();
        this.minimapDiagram.autoScaleAndCenterDiagram();
      }.bind(this), 1000);
    },

    _generateMinimapNavigator: function () {
      this.minimapNavigator = this._createMinimapNavigator();
      this.minimapNavigator.restrictedDragging = true;
      this.minimapNavigator.setReflectedDiagram(this.viewerDiagram, this.MINIMAP_SCALE);
      this.minimapNavigator.setZoomBehavior([0, 1]);
    },

    Diagram: function (svgContainer, diagramElement) {
      this.svgContainer = svgContainer;
      this.element = diagramElement;
      this.defaultScale = 1;

      this.getSvgContainerNode = function () {
        return this.svgContainer.node();
      };

      this.getElementNode = function () {
        return this.element.node();
      };

      /**
       * Scale and center the tree within the svg that contains it
       * @param {number} scale - Scale ratio to be use when scaling the depTree
       * @private
       */
      this.applyScaleWithTransition = function (scale) {
        this.applyTransformWithTransition({scale: scale});
      };

      /**
       * Calculate the right scale to fit 'g' into 'svg'
       * @param {Element} svg - Svg element containing 'g'
       * @param {Element} g - Svg group to be fitted into the 'svg' element
       * @returns {number} - Calculated scale
       * @private
       */
      this.calculateAutoScale = function () {
        var scale = Math.min(this.getWidthProportionBetweenSvgElement(), this.getHeightProportionBetweenSvgElement());
        if (isNaN(scale)) {
          console.warn('Dimensions and position of the dependency tree(s) containers could not be ' +
            'calculated. The component should be attached to the DOM.');
          return this.defaultScale;
        }
        return scale;
      };

      this.getWidthProportionBetweenSvgElement = function () {
        return this.getSvgContainerWidth() / this.getElementWidth();
      };

      this.getHeightProportionBetweenSvgElement = function () {
        return this.getSvgContainerHeight() / this.getElementHeight();
      };

      this.getSvgContainerWidth = function () {
        return this.getSvgContainerNode().parentNode.clientWidth;
      };

      this.getSvgContainerHeight = function () {
        return this.getSvgContainerNode().parentNode.clientHeight;
      };

      this.getSvgContainerDimensions = function () {
        return {
          width: this.getSvgContainerWidth(),
          height: this.getSvgContainerHeight()
        };
      };

      this.getElementWidth = function () {
        return this.getElementNode().getBBox().width;
      };

      this.getElementHeight = function () {
        return this.getElementNode().getBBox().height;
      };

      this.getElementDimensions = function () {
        return {
          width: this.getElementWidth(),
          height: this.getElementHeight()
        };
      };

      this.getSvgContainerParentWidth = function () {
        return this.getSvgContainerNode().parentNode.clientWidth;
      };

      this.getSvgContainerParentHeight = function () {
        return this.getSvgContainerNode().parentNode.clientHeight;
      };

      this.centerDiagram = function (scale) {
        if (this.getSvgContainerParentWidth() > 0 && this.getSvgContainerParentHeight() > 0) {
          this.applyTransformWithTransition(this.calculateCenterCoordinates(scale));
        }
      };

      /**
       * Calculate the right scale and coordinates to fit and center 'g' within 'svg'
       * @param {Element} svg - Svg element containing 'g'
       * @param {Element} g - Svg group to be centered and fitted into the 'svg' element
       * @private
       */
      this.autoScaleAndCenterDiagram = function () {
        var scale = this.calculateAutoScale();
        var transform = this.calculateCenterCoordinates(scale);
        transform.scale = scale;
        this.applyTransformWithTransition(transform);
      };

      /**
       * Apply a transformInfo to 'g', which can be a translation, a scale or both. The updates the zoom
       * behavior according to the applied transformInfo.
       * @param {Element} svg - Svg element containing 'g'
       * @param {Element} element - Svg group to be transformed
       * @param {object} transformInfo - Object containing current coordinates and scale of the viewer,
       * e.g: {x: 0, y: 10, scale: 0.5}
       * @private
       */
      this.applyTransformWithTransition = function (transformInfo) {
        this.element.transition()
          .attr('transform', this.generateTransformString(transformInfo));
        this.zoomDiagram(transformInfo);
      };

      this.applyTransform = function (svg, element, transformInfo) {
        element.attr('transform', this.generateTransformString(transformInfo));
        this.zoomDiagram(transformInfo);
      };

      this.generateTransformString = function (transformInfo) {
        var transformString = '';
        if ('x' in transformInfo && 'y' in transformInfo) {
          transformString += 'translate(' + transformInfo.x + ',' + transformInfo.y + ') ';
        }
        if ('scale' in transformInfo) {
          transformString += 'scale(' + transformInfo.scale + ')';
        }
        return transformString;
      };

      /**
       * Calculate the coordinates to center the 'g' element within 'svg'. It considers a scale if
       * needed
       * @param {Element} svg - Svg element containing 'g'
       * @param {Element} g - Svg group to be fitted into the 'svg' element
       * @param {number} [scale=1] - Scale to be considered in the calculation
       * @returns {{x: number, y: number}} - Coordinates to center 'g'
       * @private
       */
      this.calculateCenterCoordinates = function (scale) {
        scale = scale || this.defaultScale;
        return {
          x: Math.abs(this.getSvgContainerParentWidth() - this.getElementWidth() * scale) / 2,
          y: Math.abs(this.getSvgContainerParentHeight() - this.getElementHeight() * scale) / 2
        };
      };

      /**
       * Add zoom behavior to the viewer based on the given transform
       * @param {Element} svg - Svg element containing 'g'
       * @param {Element} g - Svg group within the 'svg' element
       * @param {object} transform - Object containing current coordinates and scale of the viewer,
       * i.e. {x: x, y: y, scale: z}
       */
      this.zoomDiagram = function (transform) {
        this.updateZoom(transform);
        this.svgContainer.call(this.zoom);
      };

      this.updateZoom = function (transform) {
        if ('x' in transform && 'y' in transform) {
          this.zoom.translate([transform.x, transform.y]);
        }
        if ('scale' in transform) {
          this.zoom.scale(transform.scale);
        }
      };

      this.setReflectedDiagram = function (reflectedDiagram, reflectedScale) {
        this.reflectedDiagram = reflectedDiagram;
        this.reflectedScale = reflectedScale || this.defaultScale;
      };

      this.setZoomBehavior = function (scaleExtent, initialTransform) {
        this.zoom = d3.behavior.zoom()
          .on('zoom', function () {
            var x = d3.event.translate[0];
            var y = d3.event.translate[1];
            if (this.restrictedDragging) {
              var maxCoordinates = this.getDragRestrictedMaxCoordinates(this.svgContainer, this.element);
              x = Math.max(0, Math.min(x, maxCoordinates.x));
              y = Math.max(0, Math.min(y, maxCoordinates.y));
            }
            this.element.attr(
              'transform', this.generateTransformString({x: x, y: y, scale: d3.event.scale})
            );
            if (this.reflectedDiagram) {
              var reflectedTransform = {};
              reflectedTransform.x = -x / (this.reflectedScale * d3.event.scale);
              reflectedTransform.y = -y / (this.reflectedScale * d3.event.scale);
              if (this.reflectedDiagram.initialPosition) {
                reflectedTransform.x += this.reflectedDiagram.initialPosition.x / d3.event.scale;
                reflectedTransform.y += this.reflectedDiagram.initialPosition.y / d3.event.scale;
              }
              reflectedTransform.scale = 1 / d3.event.scale;
              this.reflectedDiagram.element.attr(
                'transform', this.reflectedDiagram.generateTransformString(reflectedTransform)
              );
              this.reflectedDiagram.updateZoom(reflectedTransform);
            }
          }.bind(this));
        if (scaleExtent) {
          this.zoom.scaleExtent(scaleExtent);
        }
        if (initialTransform) {
          this.updateZoom(initialTransform);
        }
        this.svgContainer.call(this.zoom);
      };

      this.getDragRestrictedMaxCoordinates = function () {
        var svgBoundRect = this.getSvgContainerNode().getBoundingClientRect();
        var elementBoundRect = this.getElementNode().getBoundingClientRect();
        return {
          x: svgBoundRect.width - elementBoundRect.width,
          y: svgBoundRect.height - elementBoundRect.height
        };
      };
    }
  });
}());
