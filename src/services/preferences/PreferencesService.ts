import * as FileSystem from 'expo-file-system/legacy';

type Preferences = {
  selectedRouteId?: string;
};

const preferencesFileUri = `${FileSystem.documentDirectory ?? ''}leit-route-preferences.json`;

async function readPreferences(): Promise<Preferences> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(preferencesFileUri);

    if (!fileInfo.exists) {
      return {};
    }

    const content = await FileSystem.readAsStringAsync(preferencesFileUri);
    return JSON.parse(content) as Preferences;
  } catch {
    return {};
  }
}

async function writePreferences(preferences: Preferences) {
  await FileSystem.writeAsStringAsync(preferencesFileUri, JSON.stringify(preferences));
}

export const preferencesService = {
  async getSelectedRouteId() {
    const preferences = await readPreferences();
    return preferences.selectedRouteId ?? null;
  },

  async setSelectedRouteId(selectedRouteId: string | null) {
    const preferences = await readPreferences();

    if (selectedRouteId) {
      preferences.selectedRouteId = selectedRouteId;
    } else {
      delete preferences.selectedRouteId;
    }

    await writePreferences(preferences);
  },
};
