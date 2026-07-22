import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { taskDetailsPanelStyles } from '../../styles/commonStyles';

export function UnsupportedPrescriptionNotice() {
  return (
    <View style={taskDetailsPanelStyles.emptyState}>
      <Text style={taskDetailsPanelStyles.emptyText}>
        This prescription has a complex layout for mobile preview. For full detail, please use the web app or download the finalized PDF.
      </Text>
    </View>
  );
}
