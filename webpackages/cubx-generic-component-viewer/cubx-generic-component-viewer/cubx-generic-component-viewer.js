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
    _maxRootInputSlotWidth: 0,
    HEADER_MARGIN: 10,
    ROOT_COMPONENT_NAME_FONT: {size: 16, family: 'arial'},
    MEMBER_COMPONENT_NAME_FONT: {size: 12, family: 'arial'},
    MEMBER_ID_NAME_FONT: {size: 16, family: 'arial', weight: 'bold'},
    COMPOUND_TITLE: 'Dataflow view',
    ELEMENTARY_TITLE: 'Interface view',
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
      var viewHolder = this.$$('#' + this.VIEW_HOLDER_ID);
      viewHolder.id = this.VIEW_HOLDER_ID;
      viewHolder.style.width = this.getViewerWidth();
      viewHolder.style.height = this.getViewerHeight() || this.parentNode.clientHeight * 0.7 + 'px';
      viewHolder.style.overflow = 'hidden';
      viewHolder.style.resize = 'vertical';
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
      this.$$('#' + this.VIEW_HOLDER_ID).style.width = viewerWidth;
    },

    /**
     *  Observe the Cubbles-Component-Model: If value for slot 'viewerHeight' has changed ...
     */
    modelViewerHeightChanged: function (viewerHeight) {
      if (viewerHeight.indexOf('%') !== -1) {
        var proportion = parseInt(viewerHeight.substring(0, viewerHeight.indexOf('%'))) / 100;
        viewerHeight = this.parentNode.clientHeight * proportion + 'px';
      }
      this.$$('#' + this.VIEW_HOLDER_ID).style.height = viewerHeight;
    },

    /**
     *  Observe the Cubbles-Component-Model: If value for slot 'scale' has changed ...
     */
    modelScaleChanged: function (scale) {
      if (this.status === 'ready') {
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
     * Process a scale value to then scale the diagram correctly
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
        this._autoScaleAndCenterDiagram(this.svg, this.g);
      } else {
        this._scaleDiagram(this.svg, this.g, scale);
      }
    },

    /**
     * Indicate whether the given 'scale' is valid
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
        var scaleAsFloat = -1;
        scaleAsFloat = parseFloat(scale);
        if (isNaN(scaleAsFloat)) {
          return false;
        }
        return scaleAsFloat > 0;
      }
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
      this._updateView();
    },

    /**
     * Update the viewer title and displayed component
     * @private
     */
    _updateView: function () {
      this._maxRootInputSlotWidth = 0;
      if (this.getShowTitle()) {
        this._displayPageTitle();
      }
      this._generateAndDrawComponentGraph();
    },

    /**
     * Display provided title or default titles
     * @private
     */
    _displayPageTitle: function () {
      $('#' + this.VIEW_HOLDER_ID + '_title').css('display', 'inline-block');
      if (this.getDefinitions().members && !this.getViewerTitle()) {
        this.setViewerTitle(this.COMPOUND_TITLE);
      } else {
        this.setViewerTitle(this.ELEMENTARY_TITLE);
      }
    },

    /**
     * Generate the KGraph that represents a component represented by this._component (which can
     * also be an ad-hoc component)
     * @private
     */
    _generateAndDrawComponentGraph: function () {
      var componentGraph = {id: 'root', children: []};
      var rootComponent = this._generateGraphMember(
        this._component,
        undefined,
        this.ROOT_COMPONENT_CONFIG
      );
      rootComponent.children = this._generateGraphMembers();
      componentGraph.children.push(rootComponent);
      componentGraph.edges = this._generateGraphConnections(
        this.getDefinitions().connections || [],
        this.getDefinitions().componentArtifactId || ''
      );
      this._drawComponent(componentGraph);
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
      var componentArtifactId = member.componentId
        ? member.componentId.substr(member.componentId.indexOf('/') + 1)
        : member.artifactId;
      if (this.getDefinitions().components.hasOwnProperty(componentArtifactId)) {
        return this.getDefinitions().components[componentArtifactId];
      } else {
        console.error('The component definition of the member with artifactId: \'' +
          componentArtifactId + '\' was not found in definitions.');
      }
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
        width: Math.max(graphMemberSlots.slotsWidth + this.SLOT_LABELS_SPACE, header.width),
        height: graphMemberSlots.slotsHeight + header.height,
        ports: graphMemberSlots.slots,
        headerHeight: header.height,
        properties: {
          portConstraints: this.MEMBER_PORT_CONSTRAINTS,
          portLabelPlacement: optionals && optionals.portLabelPlacement
            ? optionals.portLabelPlacement
            : this.MEMBER_PORT_LABEL_PLACEMENT,
          nodeLabelPlacement: this.MEMBER_LABEL_PLACEMENT,
          portAlignment: this.MEMBER_PORT_ALIGNMENT,
          portSpacing: this.SLOT_SPACE,
          additionalPortSpace: 'top=' + (header.height + this.SLOTS_AREA_MARGIN * 1.5) +
          ', bottom=' + this.SLOTS_AREA_MARGIN + ',left=0,right=0',
          borderSpacing: optionals && optionals.borderSpacing ? optionals.borderSpacing : 0
        }
      };
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
      var memberIdLabel;
      var webpackageIdLabel;
      var artifactIdLabel;
      webpackageId = webpackageId ? ':' + webpackageId : '';
      artifactId = '/' + artifactId;
      if (memberId) {
        memberIdLabel = this._createLabel(memberId, this.MEMBER_ID_NAME_FONT, 'memberIdLabel');
        webpackageIdLabel = this._createLabel(webpackageId, this.MEMBER_COMPONENT_NAME_FONT, 'componentNameLabel');
        artifactIdLabel = this._createLabel(artifactId, this.MEMBER_COMPONENT_NAME_FONT, 'componentNameLabel');
      } else {
        memberIdLabel = this._createLabel('', {}, 'memberIdLabel');
        webpackageIdLabel = this._createLabel(webpackageId, this.ROOT_COMPONENT_NAME_FONT, 'componentNameRootLabel');
        artifactIdLabel = this._createLabel(artifactId, this.ROOT_COMPONENT_NAME_FONT, 'componentNameRootLabel');
      }

      return {
        labels: [memberIdLabel, webpackageIdLabel, artifactIdLabel],
        width: Math.max(memberIdLabel.width, webpackageIdLabel.width, artifactIdLabel.width) + this.HEADER_MARGIN * 2,
        height: memberIdLabel.height + webpackageIdLabel.height + artifactIdLabel.height + this.HEADER_MARGIN * 2
      };
    },

    /**
     * Create a label with the necessary properties to be displayed by the viewer
     * @param {string} text - Text of the label
     * @param {object} fontObject - {size: number, family: string, weight: string},
     * @param {string} className - css class
     * @returns {{text: string, width: number, height: number, className: string, fontObject: {}}}
     * @private
     */
    _createLabel: function (text, fontObject, className) {
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
              this._maxRootInputSlotWidth = maxSlotWidthLeft;
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
        labels: [this._createLabel(slot.slotId, this.SLOT_LABEL_FONT, '')],
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
        labels: [this._createLabel(compoundConnection.connectionId, this.CONNECTION_LABEL_FONT, '')],
        source: source,
        sourcePort: sourcePort,
        target: target,
        targetPort: targetPort,
        hookFunction: compoundConnection.hookFunction || '',
        tooltipHTML: ('<strong>Hook function:</strong><p>' + compoundConnection.hookFunction + '</p>') || '',
        highlighted: false
      };
    },

    /**
     * Scale and center the tree within the svg that contains it
     * @param {object} svg - D3 selection of the svg element
     * @param {object} g - D3 selection of the svg group (<g>) that wraps the tree
     * @param {number} scale - Scale ratio to be use when scaling the depTree
     * @returns {{x: number, y: number, scale: *}} - Final position and scale ratio
     * @private
     */
    _scaleDiagram: function (svg, g, scale) {
      this._applyTransform(svg, g, {scale: scale});
    },

    /**
     * Calculate the right scale to fit 'g' into 'svg'
     * @param {Element} svg - Svg element containing 'g'
     * @param {Element} g - Svg group to be fitted into the 'svg' element
     * @returns {number} - Calculated scale
     * @private
     */
    _calculateAutoScale: function (svg, g) {
      var svgSize;
      var gSize;
      svgSize = {
        width: svg.node().parentNode.clientWidth,
        height: svg.node().parentNode.clientHeight
      };
      gSize = {width: g.node().getBBox().width, height: g.node().getBBox().height};
      var scale = Math.min(svgSize.width / gSize.width, svgSize.height / gSize.height);
      if (isNaN(scale)) {
        console.warn('Dimensions and position of the dependency tree(s) containers could not be ' +
          'calculated. The component should be attached to the DOM.');
        return;
      }
      return scale;
    },

    /**
     * Center the 'g' element horizontally and vertically within the 'svg'
     * @param {Element} svg - Svg element containing 'g'
     * @param {Element} g - Svg group to be centered into the 'svg' element
     * @private
     */
    _centerDiagram: function (svg, g) {
      if (svg.node().parentNode.clientWidth > 0 && svg.node().parentNode.clientHeight > 0) {
        this._applyTransform(svg, g, this._calculateCenterCoordinates(svg, g));
      }
    },

    /**
     * Calculate the right scale and coordinates to fit and center 'g' within 'svg'
     * @param {Element} svg - Svg element containing 'g'
     * @param {Element} g - Svg group to be centered and fitted into the 'svg' element
     * @private
     */
    _autoScaleAndCenterDiagram: function (svg, g) {
      var scale = this._calculateAutoScale(svg, g);
      var transform = this._calculateCenterCoordinates(svg, g, scale);
      transform.scale = scale;
      this._applyTransform(svg, g, transform);
    },

    /**
     * Apply a transform to 'g', which can be a translation, a scale or both. The updates the zoom
     * behavior according to the applied transform.
     * @param {Element} svg - Svg element containing 'g'
     * @param {Element} g - Svg group to be transformed
     * @param {object} transform - Object containing current coordinates and scale of the viewer,
     * e.g: {x: 0, y: 10, scale: 0.5}
     * @private
     */
    _applyTransform: function (svg, g, transform) {
      var transformString = '';
      if ('x' in transform && 'y' in transform) {
        transformString += 'translate(' + transform.x + ',' + transform.y + ') ';
      }
      if ('scale' in transform) {
        transformString += 'scale(' + transform.scale + ')';
      }
      g.transition()
        .attr('transform', transformString);
      this._updateZoom(svg, g, transform);
    },

    /**
     * Calculate the coordinates to center the 'g' element within 'svg'. It considers a scale if
     * needed
     * @param {Element} svg - Svg element containing 'g'
     * @param {Element} g - Svg group to be fitted into the 'svg' element
     * @param {number} [scale=1] - Scale to be considered in the calculation
     * @returns {{x: number, y: number}} - Coordinates to center 'g'
     * @private
     */
    _calculateCenterCoordinates: function (svg, g, scale) {
      scale = scale || 1;
      var svgSize = {
        width: svg.node().parentNode.clientWidth,
        height: svg.node().parentNode.clientHeight
      };
      var gSize = {width: g.node().getBBox().width, height: g.node().getBBox().height};
      var newX = Math.abs(svgSize.width - gSize.width * scale) / 2;
      var newY = Math.abs(svgSize.height - gSize.height * scale) / 2;
      return {x: newX, y: newY};
    },

    /**
     * Add zoom behavior to the viewer based on the given transform
     * @param {Element} svg - Svg element containing 'g'
     * @param {Element} g - Svg group within the 'svg' element
     * @param {object} transform - Object containing current coordinates and scale of the viewer,
     * i.e. {x: x, y: y, scale: z}
     */
    _updateZoom: function (svg, g, transform) {
      if ('x' in transform && 'y' in transform) {
        this.zoom.translate([transform.x, transform.y]);
      }
      if ('scale' in transform) {
        this.zoom.scale(transform.scale);
      }
      svg.call(this.zoom);
    },

    /**
     * Add zoom behavior to the viewer based on the given initial transform, if any.
     * @param {Element} svg - Svg element containing 'g'
     * @param {Element} g - Svg group within the 'svg' element
     * @param {object} [initialTransform] - Object containing initial coordinates and scale of the
     * viewer, i.e. {x: x, y: y, scale: z}
     * @private
     */
    _setZoomBehavior: function (svg, g, initialTransform) {
      this.zoom = d3.behavior.zoom()
        .on('zoom', function () {
          g.attr('transform', 'translate(' + d3.event.translate + ')' + ' scale(' + d3.event.scale + ')');
        });
      if (initialTransform) {
        if ('x' in initialTransform && 'y' in initialTransform) {
          this.zoom.translate([initialTransform.x, initialTransform.y]);
        }
        if ('scale' in initialTransform) {
          this.zoom.scale(initialTransform.scale);
        }
      }
      svg.call(this.zoom);
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
      this.svg = d3.select('#' + this.VIEW_HOLDER_ID)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%');
      var realWidth = $('#' + this.VIEW_HOLDER_ID).width();
      var realHeight = $('#' + this.VIEW_HOLDER_ID).height();
      this.g = this.svg.append('g');
      var root = this.g.append('g');
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

      this._setZoomBehavior(this.svg, this.g);

      // Tooltip
      this.infoToolTip = d3.tip()
        .attr('class', 'info_tooltip ' + this.is)
        .offset([30, 0])
        .html(function (d) {
          return d.tooltipHTML;
        });
      this.infoToolTip.direction('e');

      this.svg.call(this.infoToolTip);

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
          if (d.children) {
            return 'componentView root ' + self.is;
          } else {
            return 'componentView member ' + self.is;
          }
        });

      var atoms = componentView.append('rect')
        .attr('class', function (d) {
          if (d.id !== 'root') {
            if (d.children) {
              return 'componentViewAtom root ' + self.is;
            } else {
              return 'componentViewAtom member ' + self.is;
            }
          } else {
            return '';
          }
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
            self._centerDiagram(self.svg, self.g);
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

    /** Highlight a connection given by the 'd3select'
     * @param {object} d3select - D3 selection of the desired connection
     * @private
     */
    _highlightConnection: function (d3select) {
      d3select.classed('highlighted', true);
    },

    /**
     * Remove the highlighting of a connection given by the 'd3select'
     * @param {object} d3select - D3 selection of the desired connection
     * @param {object} data - Data associated to the connection
     * @private
     */
    _undoHighlightConnection: function (d3select, data) {
      if (!data.highlighted) {
        d3select.classed('highlighted', false);
      }
    },

    /**
     * Draw the connections and their ids as labels
     * @param {Object} connectionData - Data of each connection (D3)
     * @private
     */
    _drawConnections: function (connectionData) {
      var self = this;
      // build the arrow.
      this.svg.append('svg:defs').selectAll('marker')
        .data(['end'])                 // define connectionView/path types
        .enter().append('svg:marker')    // add arrows
        .attr('id', String)
        .attr('class', 'arrowEnd ' + self.is)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 10)
        .attr('refY', 0)
        .attr('markerWidth', 5)        // marker settings
        .attr('markerHeight', 5)
        .attr('orient', 'auto')  // arrowhead color
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5');

      // Add connections arrows
      var connectionGroup = connectionData.enter()
        .append('g')
        .on('mouseover', function (d) {
          self._highlightConnection(d3.select(this).selectAll('path'));
        })
        .on('mouseout', function (d) {
          self._undoHighlightConnection(d3.select(this).selectAll('path'), d);
        })
        .on('click', function (d) {
          handleConnectionClick(d3.select(this).selectAll('path'), d);
        });
      var connectionView = connectionGroup
        .append('path')
        .attr('id', function (d) {
          // Remove disconnected class to source and target slots
          d3.select('#' + d.sourcePort).classed('disconnected', false);
          d3.select('#' + d.targetPort).classed('disconnected', false);
          return d.id;
        })
        .attr('class', 'connectionView ' + self.is)
        .attr('d', 'M0 0')
        .attr('marker-end', 'url(#end)');

      var connectionViewLabel = connectionGroup
        .append('text')
        .attr('class', 'connectionViewLabel ' + self.is)
        .text(function (d) {
          return d.labels[0].text + (d.hookFunction ? '\t🛈' : '') || '';
        })
        .attr('font-size', function (d) {
          return d.labels[0].fontObject.size;
        })
        .attr('font-weight', function (d) {
          return d.hookFunction ? 'bold' : d.labels[0].fontObject.weight;
        })
        .attr('font-style', function (d) {
          return d.labels[0].fontObject.style;
        })
        .attr('font-family', function (d) {
          return d.labels[0].fontObject.family;
        });

      connectionViewLabel.transition()
        .attr('transform', function (d) {
          var x = d.labels[0].x + self._maxRootInputSlotWidth + self.CONNECTION_LABEL_MARGIN;
          var y = d.labels[0].y + d.labels[0].height * 2.5;
          return 'translate(' + x + ' ' + y + ')';
        })
      ;

      connectionViewLabel.filter(function (d) {
        return d.hookFunction;
      })
        .on('mouseover', self.infoToolTip.show)
        .on('mouseout', self.infoToolTip.hide);

      // Apply connections routes
      connectionView.transition().attr('d', function (d) {
        var path = '';
        path += 'M' + (d.sourcePoint.x + self.SLOT_RADIUS) + ' ' + d.sourcePoint.y + ' ';
        (d.bendPoints || []).forEach(function (bp, i) {
          path += 'L' + bp.x + ' ' + bp.y + ' ';
        });
        path += 'L' + (d.targetPoint.x - self.SLOT_RADIUS) + ' ' + d.targetPoint.y + ' ';
        return path;
      });

      function handleConnectionClick (d3select, d) {
        d.highlighted = !d.highlighted;
        if (d.highlighted) {
          self._highlightConnection(d3select);
        } else {
          self._undoHighlightConnection(d3select, d);
        }
      }
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
      var canvas = this._getTextWidth.canvas || (this._getTextWidth.canvas = document.createElement('canvas'));
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
     * Zoom and center the diagram to fit within container
     * @private
     */
    _zoomToFit: function () {
      this._autoScaleAndCenterDiagram(this.svg, this.g);
    },

    /**
     * Save the diagram as svg file
     * @private
     */
    _saveAsSvg: function () {
      var serializer = new XMLSerializer();
      var svg = this.svg.node();
      svg.insertBefore(this._getDefsStyleElement(), svg.firstChild);
      var source = serializer.serializeToString(svg).replace('</style>', '<![CDATA[' + this._getStylesString() + ']]>' + '</style>');
      // add name spaces.
      if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      if (!source.match(/^<svg[^>]+"http:\/\/www\.w3\.org\/1999\/xlink"/)) {
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
      }
      // add xml declaration
      source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

      var blob = new Blob([source], {type: 'image/svg+xml'});
      saveAs(blob, this._component.artifactId + '.svg');
    },

    _hideShowDisconnectedSlots: function (e) {
      if (this._disconnectedSlotsHidden) {
        d3.selectAll('.disconnected').style('display', 'block');
        e.currentTarget.querySelector('i').classList.remove('glyphicon-eye-open');
        e.currentTarget.querySelector('i').classList.add('glyphicon-eye-close');
        e.currentTarget.querySelector('span').innerHTML = 'Hide disconnected slots';
      } else {
        d3.selectAll('.disconnected').style('display', 'none');
        e.currentTarget.querySelector('i').classList.remove('glyphicon-eye-close');
        e.currentTarget.querySelector('i').classList.add('glyphicon-eye-open');
        e.currentTarget.querySelector('span').innerHTML = 'Show disconnected slots';
      }
      this._disconnectedSlotsHidden = !this._disconnectedSlotsHidden;
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
    _getStylesString: function () {
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
    }
  });
}());
