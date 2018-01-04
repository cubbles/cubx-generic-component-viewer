## cubx-generic-component-viewer
Contains component(s) to visualise the interface and/or dataflow of a component without using a manifest.
### Artifacts of the webpackage
| Name | Type | Description | Links |
|---|---|---|---|
| **docs** | Application | Generated webpackage documentation. | [docs](https://cubbles.world/sandbox/cubx-generic-component-viewer@1.3.3/docs/index.html)  |
| **cubx-generic-component-viewer** | Elementary Component | Component to visualise the interface and/or dataflow of a component without using a manifest | [demo](https://cubbles.world/sandbox/cubx-generic-component-viewer@1.3.3/cubx-generic-component-viewer/demo/index.html) [Complex demo](https://cubbles.world/sandbox/cubx-generic-component-viewer@1.3.3/cubx-generic-component-viewer/demo/complexDemo.html) [docs](https://cubbles.world/sandbox/cubx-generic-component-viewer@1.3.3/cubx-generic-component-viewer/docs/index.html)  |
### Use of components
The html file should contain the desire component using its tag, e.g. the `<cubx-generic-component-viewer>`, as follows:
```html
<cubx-generic-component-viewer cubx-webpackage-id="cubx-generic-component-viewer@1.3.3"></cubx-generic-component-viewer>
```
Note that the `webpackageId` should be provided, which in this case is: `cubx-generic-component-viewer@1.3.3`.
Additionally, this component can be initialized using the `<cubx-core-slot-init>` tag (available from _cubx.core.rte@1.9.0_).
For example, lets initialize the `definitions` slot to get the basic package of ckeditor:
```html
<cubx-generic-component-viewer cubx-webpackage-id="cubx-generic-component-viewer@1.3.3"></cubx-generic-component-viewer>
	<!--Initilization-->
	<cubx-core-init style="display:none">
		<cubx-core-slot-init slot="definitions">{"components":{"cubx-textarea":{"artifactId":"cubx-textarea","slots":[{"slotId":"value","direction":["output","input"]}],"webpackageId":"com.incowia.basic-html-components@1.4-SNAPSHOT"}},"members":[{"memberId":"textarea1","artifactId":"cubx-textarea"},{"memberId":"textarea2","artifactId":"cubx-textarea"}],"connections":[{"connectionId":"valueCon","copyValue":true,"destination":{"memberIdRef":"textarea2","slot":"value"},"source":{"memberIdRef":"textarea1","slot":"value"},"hookFunction":null,"repeatedValues":false}]}</cubx-core-slot-init>
	</cubx-core-init>
</cubx-generic-component-viewer>
```
Or it can be initialized and later manipulated from Javascript as follows:
```javascript
var component= document.querySelector('cubx-generic-component-viewer');
// Wait until CIF is ready
document.addEventListener('cifReady', function() {
	// Manipulate slots
	component.setDefinitions({"components":{"cubx-textarea":{"artifactId":"cubx-textarea","slots":[{"slotId":"value","direction":["output","input"]}],"webpackageId":"com.incowia.basic-html-components@1.4-SNAPSHOT"}},"members":[{"memberId":"textarea1","artifactId":"cubx-textarea"},{"memberId":"textarea2","artifactId":"cubx-textarea"}],"connections":[{"connectionId":"valueCon","copyValue":true,"destination":{"memberIdRef":"textarea2","slot":"value"},"source":{"memberIdRef":"textarea1","slot":"value"},"hookFunction":null,"repeatedValues":false}]});
});
```
[Want to get to know the Cubbles Platform?](https://cubbles.github.io)
